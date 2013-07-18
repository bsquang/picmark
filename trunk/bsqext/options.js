var BG = chrome.extension.getBackgroundPage();
var bsq_temp = "";
var selectedID = 0;

function isJsonString(str) { try { JSON.parse(str); } catch (e) { return false; } return true; }
function filterXML(content) {
    var temp = content;
    temp = temp.replace(/</gi, "&lt;");
    temp = temp.replace(/>/gi, "&gt;");
    temp = temp.replace(/&/gi, "&amp;");
    temp = temp.replace(/'/gi, "&apos;");
    temp = temp.replace(/"/gi, "&quot;");
    return temp;
}

function checkExist(photoId) {
    return $(".bsq-item[id-photo='" + photoId + "']");
}

function getComment(albumId, photoId, callback) {
    var link = "https://picasaweb.google.com/data/feed/api/user/default/albumid/" + albumId + "/photoid/" + photoId;
    //.feed.entry[0].content.$t -> Content
    BG.OAUTH.authorize(function () {
        var url = link;
        var request = {
            'method': 'GET',
            'parameters': {
                'kind': 'comment',
                'alt': 'json'
            }
        };
        BG.OAUTH.sendSignedRequest(url, function (resp, xhr) {
            if (!(xhr.status >= 200 && xhr.status <= 299)) {
                alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"');
                return;
            }
            var temp = JSON.parse(resp);
            callback(xhr.status, temp);
        }, request);
    })
}

function movePhotos(photoId, albumIdFrom, albumIdTo, callback) {
    var link = "https://picasaweb.google.com/data/entry/api/user/default/albumid/" + albumIdFrom + "/photoid/" + photoId;
    var body = "<entry xmlns='http://www.w3.org/2005/Atom'" +
        " xmlns:exif='http://schemas.google.com/photos/exif/2007'" +
        " xmlns:gphoto='http://schemas.google.com/photos/2007'" +
        " xmlns:media='http://search.yahoo.com/mrss/'>" +
        "<gphoto:albumid>" + albumIdTo + "</gphoto:albumid></entry>";

    function complete(resp, xhr) {
        if (!(xhr.status >= 200 && xhr.status <= 299)) {
            alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"');
            return;
        }
        callback(xhr.status, JSON.parse(resp));
    }
    BG.OAUTH.authorize(function () {
        BG.OAUTH.sendSignedRequest(
            link,
            complete, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/xml',
                    'GData-Version': '2',
                    'If-Match': '*'
                },
                parameters: {
                    alt: 'json'
                },
                body: body
            }
        );
    });
}

function getInfoPhoto(photoId, albumId, callback) {
	BG.OAUTH.authorize(function () {
		var url = "https://picasaweb.google.com/data/feed/api/user/default/albumid/"+albumId+"/photoid/"+photoId;
		var request = {
			'method': 'GET'
			//'parameters': {'alt': 'json'}
		};
		BG.OAUTH.sendSignedRequest(url, function (resp, xhr) {
			if (!(xhr.status >= 200 && xhr.status <= 299)) {
				alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"');
				return;
			}
			var temp = JSON.parse(resp);
			callback(xhr.status, temp);
		}, request);
	})
}

function createAlbum(name,callback) {

    var data = '<entry xmlns="http://www.w3.org/2005/Atom" ' +
        'xmlns:media="http://search.yahoo.com/mrss/" ' +
        'xmlns:gphoto="http://schemas.google.com/photos/2007">' +
        '<title type="text">' + filterXML(name) +
        '</title><category scheme="http://schemas.google.com/g/2005#kind" ' +
        'term="http://schemas.google.com/photos/2007#album"></category>' +
        '</entry>';

    function complete(resp, xhr) {                         
        if (!(xhr.status >= 200 && xhr.status <= 299)) { alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"'); return;}
        
        console.log("create album");
        var temp = JSON.parse(resp);        
        
        
        callback(xhr.status,JSON.parse(resp));
    }
    
    BG.OAUTH.authorize(function() {
      BG.OAUTH.sendSignedRequest('https://picasaweb.google.com/data/feed/api/user/default',
        complete,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/atom+xml'
          },
          parameters: {
            alt: 'json'
          },
          body: data
        }
      );
    });
}

function deleteAlbum(callback) {
    //Check album name
    //Can not delete picMark album
    var checkName = $('#bsq-select-album option[value="'+localStorage['albumSelected']+'"]').text();
    if (checkName != 'picMark') {
        var result = confirm("Are you sure delete album?");
        if (result == true) {
            BG.OAUTH.authorize(function () {
                var url = 'https://picasaweb.google.com/data/entry/api/user/default/albumid/' + localStorage['albumSelected'];
                var request = {
                    'method': 'DELETE',
                    'headers': {
                        'If-Match': '*'
                    },
                    'parameters': {
                        'alt': 'json'
                    }
                };
                BG.OAUTH.sendSignedRequest(url, function (resp, xhr) {
                    if (!(xhr.status >= 200 && xhr.status <= 299)) {
                        alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"');
                        return;
                    }
                    
                    callback(xhr);
                }, request);
            })
        }   
    }else{
        alert('Can not delete this album !');
    }
}

function logout() {
	//Logout google
	BG.OAUTH.clearTokens();
	//Clear albumid in localstorage
	localStorage['albumSelected'] = "none";
   localStorage['picMarkID'] = 'none';
	$('#bsq-list-image').html('');
	
   $('#panel-album').hide();
   
	$("#bsq-logout").text('Login');
	$("#bsq-logout").click(function () {
		location.reload();
	})
}

function processAlbumList(data) {
    $('#connected-list').hide();
    //If empty album
    if (data.feed.entry == undefined) {
        createAlbum("picMark", function (stat, resp) {
            localStorage['albumSelected'] = resp.entry.gphoto$id.$t;
            alert("Done! " + resp.entry.title.$t + " ---> Created!");
            location.reload();
        })
    }
    if (data.feed.entry.length > 0) {
        $('#panel-album').css({"display":"inline-block"});
        for (var i = 0; i < data.feed.entry.length; i++) {
            var idAlbum = data.feed.entry[i].gphoto$id.$t;
            var titleAlbum = data.feed.entry[i].title.$t;
            var temp = "<option value='" + idAlbum + "'>";
            temp += titleAlbum + "</option>"
            if (titleAlbum == "picMark") {
                localStorage['picMarkID'] = idAlbum;
            }
            $('#bsq-select-album').append(temp);
        }
        if (localStorage['albumSelected'] != "none" && localStorage['albumSelected'] != undefined) {
            getPhotos(localStorage['albumSelected'], function (status, resp) {
                processListPhotos(resp)
            });
        } else {
            if (localStorage['picMarkID'] != 'none' && localStorage['albumSelected'] != undefined) {
                //Just delete album
                //Will go into picMark album
                localStorage['albumSelected'] = localStorage['picMarkID'];
                getPhotos(localStorage['albumSelected'], function (status, resp) {
                    processListPhotos(resp)
                });
            } else {
                createAlbum("picMark", function (stat, resp) {
                    localStorage['albumSelected'] = resp.entry.gphoto$id.$t;
                    alert("Done! " + resp.entry.title.$t + " ---> Created!");
                    location.reload();
                })
            }
        }
        
        $('#bsq-select-album option[value="' + localStorage['albumSelected'] + '"]').attr({
            'selected': 'selected'
        })
        
        $('#bsq-select-album').change(function () {
            //localStorage albumid
            localStorage['albumSelected'] = $(this).val();
            getPhotos(localStorage['albumSelected'], function (status, resp) {
                processListPhotos(resp)
            });
        })
    }
}


function getAlbum(callback) {
    //Login into google account
    BG.OAUTH.authorize(function () {
        var url = 'https://picasaweb.google.com/data/feed/api/user/default';
        var request = {
            'method': 'GET',
            'parameters': {
                'alt': 'json'
            }
        };
        //Get album list
        //Get https://picasaweb.google.com/data/feed/api/user/default
        BG.OAUTH.sendSignedRequest(url, function (resp, xhr) {
            callback(xhr, resp);
        }, request);
    })
}

function processListPhotos(data) {
    $('#bsq-list-image').html('');    
    if (data.feed.entry != undefined) {
        for (var i = (data.feed.entry.length - 1); i >= 0; i--) {
            var url = data.feed.entry[i].content.src;
            var idPhoto = data.feed.entry[i].gphoto$id.$t;
            var link = data.feed.entry[i].summary.$t.split("--bsq--")[1];
            var title = data.feed.entry[i].summary.$t.split("--bsq--")[0];
            var temp_img = "<img src='" + url + "' title='" + title + "'/>";
            var temp_div = "<div class='bsq-item group' id-photo='" + idPhoto + "'>";
            temp_div += "<div class='bsq-item-button-delete button-delete'>X</div>";
            temp_div += temp_img;
            //Time info and go button
            var time = new Date(Date.parse(data.feed.entry[i].updated.$t));
            temp_div += "<div class='bsq-info-time'>";
            temp_div += time.toLocaleString();
            if (data.feed.entry[i].summary.$t != "") {
                temp_div += "<a href='" + link + "' target='_blank'>";
                temp_div += "<div class='bsq-item-button-go'>Go</div>";
                temp_div += "</a>";
            }
            temp_div += "</div>";
            //Comment
            getComment(localStorage['albumSelected'], idPhoto, function (status, resp) {
                if (resp.feed.entry != undefined) {
                    //console.log(resp);
                    var temp_content = resp.feed.entry[0].content.$t;
                    var temp_id = resp.feed.gphoto$id.$t;
                    var temp_div = "<div class='bsq-info-comment'>";
                    temp_div += temp_content;
                    temp_div += "</div>";
                    $(".bsq-item[id-photo='" + temp_id + "']").append(temp_div);
                }
            })
            //End
            temp_div += "</div>";
            $('#bsq-list-image').append(temp_div);
        }
        $(".bsq-item").bind("mouseover", function () {
            $(this).find('.bsq-item-button-delete').show();
            $(this).find('.bsq-item-button-go').show();
            $(this).find('.bsq-info-comment').stop().slideToggle();
        });
        $(".bsq-item").bind("mouseout", function () {
            $(this).find('.bsq-item-button-delete').hide();
            $(this).find('.bsq-item-button-go').hide();
            $(this).find('.bsq-info-comment').stop().slideToggle();
        });
        $(".bsq-item").find('.button-delete').click(function () {
            var tempId = $(this).parent().attr("id-photo");
            console.log("deletePhoto " + tempId);
            deletePhoto(tempId,localStorage['albumSelected']);
        });
    }
}

function deletePhoto(photoId, albumId) {
    var result = confirm("Are you sure delete ?");
    if (result == true) {
        BG.OAUTH.authorize(function () {
            var url = "https://picasaweb.google.com/data/entry/api/user/default/albumid/"+albumId+"/photoid/"+photoId;
            var request = {
                'method': 'DELETE',
                'headers': {
                    'If-Match': '*'
                },
                'parameters': {
                    'alt': 'json'
                }
            };
            BG.OAUTH.sendSignedRequest(url, function (resp, xhr) {
                if (!(xhr.status >= 200 && xhr.status <= 299)) {
                    alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"');
                    return;
                }
                $(".bsq-item[id-photo=" + photoId + "]").fadeOut();
            }, request);
        })
    }
}

function getPhotos(albumId, callback) {
    BG.OAUTH.authorize(function () {
        var url = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/' + albumId;
        var request = {
            'method': 'GET',
            'parameters': {
                'alt': 'json'
            }
        };
        BG.OAUTH.sendSignedRequest(url, function (resp, xhr) {
            if (!(xhr.status >= 200 && xhr.status <= 299)) {
                alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"');
                return;
            }
            var temp = JSON.parse(resp);
            callback(xhr.status, temp);
        }, request);
    })
}

$(document).ready(function () {
    
    //Process first load album
    getAlbum(function (xhr, resp) {
        //console.log(resp);
        if (xhr.status == 404) {
            // Unknown user, empty album
            createAlbum("picMark", function (stat, resp) {
                localStorage['albumSelected'] = resp.entry.gphoto$id.$t;
                alert("Done! " + resp.entry.title.$t + " ---> Created!");
                location.reload();
            })
            
        }else if (!(xhr.status >= 200 && xhr.status <= 299)) {
            alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"');
            return;
        }
        
        var temp = JSON.parse(resp);
        processAlbumList(temp);
        
    });
    
    $("#bsq-create-album").click(function () {
        var result = prompt("Enter your name album:", "");
        if (result != null && result != "") {
            createAlbum(result, function (stat, resp) {
                
                localStorage['albumSelected'] = resp.entry.gphoto$id.$t;
                alert("Done! " + resp.entry.title.$t + " ---> Created!");
                location.reload();
            })
        }
    })
    $("#bsq-delete-album").click(function () {
        deleteAlbum(function(xhr){
            
            localStorage['albumSelected'] = 'none';
            location.reload();
        });
    })
    $("#bsq-logout").click(function () {
        logout();
    })
    $("#bsq-list-image").height($(document).height() - $(".wrapper-panel").height() - 50)
});

