var bsq_temp = '';

var OAUTH = ChromeExOAuth.initBackgroundPage({
  'request_url' : 'https://www.google.com/accounts/OAuthGetRequestToken',
  'authorize_url' : 'https://www.google.com/accounts/OAuthAuthorizeToken',
  'access_url' : 'https://www.google.com/accounts/OAuthGetAccessToken',
  'consumer_key' : 'anonymous',
  'consumer_secret' : 'anonymous',
  'scope' : 'http://picasaweb.google.com/data/',
  'app_name' : 'bsq!picMark'
});

function getAuthorization(url) {

    var method = 'POST';
    var params = {'alt': 'json'};
    
    return OAUTH.getAuthorizationHeader(url, method, params)
}

function logOut() { OAUTH.clearTokens(); }

//Click to icon extension
chrome.browserAction.onClicked.addListener(function(tab) {
  //chrome.tabs.executeScript(null, {code:"document.body.bgColor='red'"});
  chrome.tabs.create({
		url: "options.html",
		selected: true
	});
  
});


var picasa = {
update : function(summary, link, callback){
    
    var update_link = link.replace("?alt=json","");
    
    var body = "<entry xmlns='http://www.w3.org/2005/Atom'"+
    " xmlns:exif='http://schemas.google.com/photos/exif/2007'"+
    " xmlns:gphoto='http://schemas.google.com/photos/2007'"+
    " xmlns:media='http://search.yahoo.com/mrss/'>"+
    "<summary type='text'>"+summary+"</summary></entry>";
    
    function complete(resp, xhr) {                         
        if (!(xhr.status >= 200 && xhr.status <= 299)) { alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"'); }        

        callback(xhr.status,JSON.parse(resp));
    }
    
    OAUTH.authorize(function() {
      OAUTH.sendSignedRequest(
        update_link,
        complete,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/xml',
            'GData-Version': '2',
            'If-Match':'*'
          },
          parameters: {
            alt: 'json'
          },
          body: body
        }
      );
    });
    
},

upload: function(imageData, callback) {
      
    var UPLOAD_BASE_URL = 'https://picasaweb.google.com/data/feed/api/user/default/albumid/';
    //Create 
    var imageFile = new Date().getTime() + '.png'; 
    
    var blob = new Blob([new Uint8Array(Base64.decode(imageData).buffer)],{type: 'image/png'});    
    
    function complete(resp, xhr) {                         
        if (!(xhr.status >= 200 && xhr.status <= 299)) { alert('Error: Response status = ' + xhr.status + ', response body = "' + xhr.responseText + '"'); }
        
        callback(xhr.status,JSON.parse(resp));
    }
    
    OAUTH.authorize(function() {
      OAUTH.sendSignedRequest('http://picasaweb.google.com/data/feed/api/user/default/albumid/' + localStorage['albumSelected'],
        complete,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'image/png',
            'Slug': imageFile
          },
          parameters: {
            alt: 'json'
          },
          body: blob
        }
      );
    });
    
   
    }
}

function filterXML(content) {
    var temp = content;
    
    temp = temp.replace(/</gi, "&lt;");
    temp = temp.replace(/>/gi,"&gt;");
    temp = temp.replace(/&/gi,"&amp;");
    temp = temp.replace(/'/gi,"&apos;");
    temp = temp.replace(/"/gi,"&quot;");
    
    return temp;    
}

var requestMessenger = new UTILS.RequestMessenger();
function captureArea(id) {
    //var evtD = new UTILS.EventDispatcher(['EVENT_SUCCESS']);
    
    chrome.tabs.captureVisibleTab(null, { format: "png" }, function (img) {
    		chrome.tabs.getSelected(null, function (tab) {
    
            requestMessenger.addEventListener("got_area", function (e) {
                requestMessenger.removeEventListener("got_area", arguments.callee);
                
                var canvas = document.createElement('canvas');
                canvas.width = e.Data.width;
                canvas.height = e.Data.height;
                var ctx = canvas.getContext('2d');
                var i = new Image();
                i.src = img;
                
                i.onload = function () {
                    
                    console.log(e.Data.bsqID);
                    
                    ctx.drawImage(i, e.Data.left, e.Data.top, e.Data.width, e.Data.height, 0, 0, e.Data.width, e.Data.height);                   
                    var dataImage = canvas.toDataURL("image/png");
                    dataImage = dataImage.replace('data:image/png;base64,', '');
                    var blob = new Blob([new Uint8Array(Base64.decode(dataImage).buffer)],{type: 'image/png'});
                    
                    //chrome.pageAction.show(tab.id);
                    picasa.upload(dataImage,function(status,res){
                        
                        console.log('Finish upload!');
                        
                        var temp_content = filterXML(tab.title) + "--bsq--" + filterXML(tab.url);
                        
                        picasa.update(temp_content,res.entry.id.$t,function(status,res){
                            console.log('Finish update!');
                            
                            //chrome.pageAction.hide(tab.id);                            
                            
                            chrome.tabs.sendMessage(tab.id, {greeting: "turnOff", bsq_id:e.Data.bsqID}, function(response) {});
                            
                            //requestMessenger.dispatchEvent(requestMessenger.EVENT_SUCCESS, "turnoff");                            
                            
                            //alert(tab.title + "\n-----> picMark!");      
                        });
                        
                    })                    
                    
                    //evtD.dispatchEvent(evtD.EVENT_SUCCESS, canvas.toDataURL("image/png"));
                };
                
            }, true);
        
            chrome.tabs.executeScript(id, { file: "js/inject/captureArea.js" });
        });
    });
}


function managePage(info,tab) {
    chrome.tabs.create({
		url: "options.html",
		selected: true
	});
}

var parent = chrome.contextMenus.create({
    "title": "picMark"
});
var child1 = chrome.contextMenus.create({
    "title": "Capture region",
    "parentId": parent,
    "onclick": function(info,tab){captureArea(tab.id);}
});
var child2 = chrome.contextMenus.create({
    "title": "Manage",
    "parentId": parent,
    "onclick": managePage
});





