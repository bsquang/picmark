var BG = chrome.extension.getBackgroundPage();
var bsq_temp = "";

var selectedID = 0;

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
    
    
    for (var i = 0;i<data.feed.entry.length;i++) {
        
        var url = data.feed.entry[i].content.src;
        
        var link = data.feed.entry[i].summary.$t.split("--bsq--")[1];
        var title = data.feed.entry[i].summary.$t.split("--bsq--")[0];
        
        var temp_img = "<img src='"+url+"' title='"+title+"'/>";
        
        var temp_div = "<div class='bsq-item clearfix' id-item='"+i+"'>";
        temp_div += temp_img;        
        
        
        if (data.feed.entry[i].summary.$t != "") {
            //code
            
            temp_div += "<div class='bsq-item-info'>";
            
            temp_div += "<a href='"+link+"' target='_blank'>";
            temp_div += "<div class='bsq-item-info-button clearfix'>Go</div>";
            temp_div += "</a>";
            
            temp_div += "<div class='bsq-item-info-button button-delete clearfix'>Delete</div>";
            
            temp_div += "</div>";
            
            var temp_id = data.feed.entry[i].id.$t.replace("?alt=json","");
            
            listIdPhotos[i] = temp_id;
        }
        
        
        temp_div += "</div>";
        
        $('#bsq-list-image').append(temp_div);
        
        //var temp_attr = ".bsq-item[id-item="+i+"]";         
        
        //console.log(temp_attr);
        
        //bsq_temp = data.feed.entry[i];
    }
    
    $(".bsq-item").find('.button-delete').click(function(){
        
        bsq_temp = $(this).parent().parent().attr("id-item");
        console.log("deletePhoto " + bsq_temp);
        
        deletePhoto(bsq_temp);
        
    });
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
                
                $(".bsq-item[id-item="+id+"]").hide();
                
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
    
    $("#bsq-logout").click(function(){
        logout();
    })
});