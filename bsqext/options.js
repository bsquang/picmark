var BG = chrome.extension.getBackgroundPage();
var bsq_temp = "";

var selectedID = 0;

function filterXML(content) {
    var temp = content;
    
    temp = temp.replace(/</gi, "&lt;");
    temp = temp.replace(/>/gi,"&gt;");
    temp = temp.replace(/&/gi,"&amp;");
    temp = temp.replace(/'/gi,"&apos;");
    temp = temp.replace(/"/gi,"&quot;");
    
    return temp;    
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
        bsq_temp = JSON.parse(resp);
        
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


function logout() {
    //Logout google
    BG.OAUTH.clearTokens();
    //Clear albumid in localstorage
    localStorage['albumSelected'] = "none";
    
    $('#bsq-list-image').html('');
    $('#bsq-select-album').hide();
    
    $("#bsq-logout").text('Login');
    $("#bsq-logout").click(function(){
        location.reload();
    })
    
}

function processAlbumList(data) {
    $('#connected-list').hide();
    
    if (data.feed.entry.length>0) {
        $('#bsq-select-album').show();
    }
    
    for (var i=0;i<data.feed.entry.length;i++) {
        
        var idAlbum = data.feed.entry[i].gphoto$id.$t;
        var titleAlbum = data.feed.entry[i].title.$t;
        
        var temp = "<option value='"+ idAlbum +"'";
        
        //Check selected localstorage
        if (localStorage['albumSelected']!="none") {
            if (idAlbum == localStorage['albumSelected']) {
                temp += " selected";
            }
        }
        
        temp += ">"+titleAlbum+"</option>"
        $('#bsq-select-album').append(temp);
    }
    
    if (localStorage['albumSelected'] != "none" ) {
        getPhotos(localStorage['albumSelected']);
    }
    
    $('#bsq-select-album').change(function(){
        //localStorage albumid
        localStorage['albumSelected'] = $(this).val();
        
        getPhotos(localStorage['albumSelected']);
    })
    
    
}
function addPicasaAlbum() {
    //Login into google account
    BG.OAUTH.authorize(function(){
        var url = 'https://picasaweb.google.com/data/feed/api/user/default';
        var request = {
            'method': 'GET',
            'parameters': {'alt': 'json'}
        };
        
        //Get album list
        //Get https://picasaweb.google.com/data/feed/api/user/default
        
        BG.OAUTH.sendSignedRequest(url, function(resp,xhr){
            if (!(xhr.status >= 200 && xhr.status <= 299)) { alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"'); return; }
            
            var temp = JSON.parse(resp);
            processAlbumList(temp);
            
        }, request);
      
    })    
}

var listPhotos = '';
var listIdPhotos = {};
function processListPhotos(data) {
    
    $('#bsq-list-image').html('');
    listIdPhotos = {};
    
    if (data.feed.entry != undefined ) {
    
        for (var i = (data.feed.entry.length-1);i>=0;i--) {
            
            var url = data.feed.entry[i].content.src;
            
            var link = data.feed.entry[i].summary.$t.split("--bsq--")[1];
            var title = data.feed.entry[i].summary.$t.split("--bsq--")[0];
            
            var temp_img = "<img src='"+url+"' title='"+title+"'/>";
            
            var temp_div = "<div class='bsq-item group' id-item='"+i+"'>";
            temp_div += "<div class='bsq-item-button-delete button-delete'>X</div>";
                 
            temp_div += temp_img;   
            
            if (data.feed.entry[i].summary.$t != "") {
                //code
                
                //temp_div += "<div class='bsq-item-info'>";
                
                temp_div += "<a href='"+link+"' target='_blank'>";
                temp_div += "<div class='bsq-item-button-go'>Go</div>";
                temp_div += "</a>";
                
                //temp_div += "</div>";
            } 
            
            var temp_id = data.feed.entry[i].id.$t.replace("?alt=json","");
            listIdPhotos[i] = temp_id;
            
            
            temp_div += "</div>";
            
            $('#bsq-list-image').append(temp_div);
        }
        
        //$(".bsq-item").bind("mouseover",function(){
        //    
        //    $(this).find('.button-delete').stop().slideToggle(300);
        //    $(this).find('.bsq-item-info-button').stop().slideToggle(300);
        //    
        //});
        //$(".bsq-item").bind("mouseout",function(){
        //    
        //    $(this).find('.button-delete').stop().slideToggle(100);
        //    $(this).find('.bsq-item-info-button').stop().slideToggle(100);
        //    
        //});
        
        $(".bsq-item").find('.button-delete').click(function(){
            
            var temp = $(this).parent().attr("id-item");
            console.log("deletePhoto " + temp);
            
            deletePhoto(temp);
            
        }); 
    
    }
}


function deletePhoto(id) {
    
    var temp_id = listIdPhotos[id];
    
    var result = confirm("Are you sure delete ?");
    if (result == true) {
        BG.OAUTH.authorize(function(){
            var url = temp_id;
            var request = {
                'method': 'DELETE',
                'headers': { 'If-Match':'*'},
                'parameters': { 'alt':'json' }
            };
            
            
            BG.OAUTH.sendSignedRequest(url, function(resp,xhr){
                if (!(xhr.status >= 200 && xhr.status <= 299)) { alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"'); return; }
                
                $(".bsq-item[id-item="+id+"]").fadeOut();
                
            }, request);
           
        })
    }
    else
    {
        
    }
    
    
}

function getPhotos(id) {
    
    BG.OAUTH.authorize(function(){
        var url = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/'+id;
        var request = {
            'method': 'GET',
            'parameters': {'alt': 'json'}
        };
        
        
        BG.OAUTH.sendSignedRequest(url, function(resp,xhr){
            if (!(xhr.status >= 200 && xhr.status <= 299)) { alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"'); return; }
            
            listPhotos = JSON.parse(resp);
            processListPhotos(listPhotos);
            
        }, request);
      
    })    
    
}


$(document).ready(function() {
    addPicasaAlbum();
    
    $("#bsq-create-album").click(function(){
        var result = prompt("Enter your name album:","");
        if (result!=null && result!="") {
            
            createAlbum(result,function(status,res){
                alert("Done! " + entry.title.$t + " ---> Created!");
            })
            
        }
    })
    $("#bsq-logout").click(function(){
        logout();
    })
});