// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO: stop using pauses and use network detection or messaging with the content script
// to tell when things have stopped loading
// TODO: make the clicking more robust - use the content script?
// TODO: store the auth token between loads
// TODO: figure out how to switch on the client permission as well as the files:write:user permission - or at least monitor the RTM and be able to upload files (maybe you only need client?)
  // although this looks to work with client,post,identity permissions (i.e. files works with post)
// TODO: make Message Button / Interactive Component in Slack for requestee
  // amazingly, Slack just bought this company that does something similar - https://missions.ai/

// Promise wrappers for chrome APIs
function get(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch(ex) {
          console.error('Problem with response', response, ex);
          reject(ex);
        }
      }
    }
    xhr.send();
  });
}
function base64ToBlob(data, type) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    var byteString = atob(data);
    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    // write the ArrayBuffer to a blob, and you're done
    // return new Blob([ia], { type: type });
    return new Blob([ia]);
}
function slackGet(endpoint) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    var url = 'https://slack.com/api/' + endpoint;
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Bearer ' + SLACK.access_token);
    // TODO: set multipart file data
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch(ex) {
          console.error('Problem with response', xhr, ex);
          reject(ex);
        }
      }
    };
    xhr.send();
  });
}
function slackMessagePost(channel, msg) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    var url = 'https://slack.com/api/chat.postMessage';
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + SLACK.access_token);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch(ex) {
          console.error('Problem with response', xhr, ex);
          reject(ex);
        }
      }
    };
    var postBody = {
      channel: channel,
      text: msg,
      as_user: false
    };
    console.log('postBody', postBody);
    xhr.send(JSON.stringify(postBody));
  });
}
function slackFilePost(data) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    var url = 'https://slack.com/api/files.upload';
    // var url = 'https://requestbin.fullcontact.com/10vqpah1';
    xhr.open('POST', url, true);
    // xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    // xhr.setRequestHeader('Content-Type', 'multipart/form-data');
    xhr.setRequestHeader('Authorization', 'Bearer ' + SLACK.access_token);
    // TODO: set multipart file data
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch(ex) {
          console.error('Problem with response', xhr, ex);
          reject(ex);
        }
      }
    };
    // TODO: replace with real data
    // data = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAa0lEQVR4AWMYTMAv3ne/bz8Dg+/8UH6sCnzqff/77mdgAJLv/eLxKgDD/V7yOBXAoE89AQW16/EoSLt/o/+/Aw4FQd/nrv+f8F8AzQ2p+Wn305YzMNQdf1n/3wCLL/4bAHV5AGmP/xx0jgIA/hdJeBPwghAAAAAASUVORK5CYII=';
    // var byteCharacters = atob(data);
    // var byteNumbers = new Array(byteCharacters.length);
    // for (var i = 0; i < byteCharacters.length; i++) {
    //     byteNumbers[i] = byteCharacters.charCodeAt(i);
    // }
    // var byteArray = new Uint8Array(byteNumbers);
    // var blob = new Blob([byteArray], { type: 'image/png' });
    // TODO: try this instead:
    // - add data:image/png;base64, to front of imageData
    // - then: fetch(imageData)
    //          .then(res => res.blob())
    //          .then(blob => console.log(blob));
    var blob = base64ToBlob(data, 'image/png');
    var formData = new FormData();
    formData.append('channels', ['D1ENYA29G']);
    var filename = 'test upload' + Date.now() + '.png';
    formData.append('filename', filename);
    formData.append('filetype', 'png');
    formData.append('file', blob, filename);
    // var postBody = {
    //   // Jonathan's Slack ID is U050TMAF3
    //   // Jonathan's IM channel is D1ENYA29G
    //   channels: ['D1ENYA29G'],
    //   filename: 'test upload ' + Date.now() + '.png',
    //   filetype: 'png',
    //   content: data // base64 encoded
    // };
    // postBody = Object.keys(postBody).map(key => key + '=' + postBody[key]);
    // console.log('postBody', postBody);
    console.log('formData', formData);
    xhr.send(formData);
  });
}
function sendCommand(target, command, params) {
  return new Promise(function(resolve, reject) {
    chrome.debugger.sendCommand(target, command, params, function(response) {
      resolve(response);
    });
  });
}
function executeScript(tabId, target) {
  return new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(tabId, target, function(response) {
      resolve(response);
    });
  });
}
function sendMessage(tabId, message) {
  return new Promise(function(resolve, reject) {
    chrome.tabs.sendMessage(tabId, message, function(response) {
      resolve(response);
    });
  });
}
function launchWebAuthFlow(options) {
  return new Promise(function(resolve, reject) {
    chrome.identity.launchWebAuthFlow(options, function(response) {
      resolve(response);
    });
  });
}
// other utility Promisified methods
function wait(ms) {
  return new Promise(function(resolve, reject) { window.setTimeout(resolve, ms); });
}
function clickSelector(target, selector) {
  return sendCommand(target, 'DOM.getDocument')
  .then(function(rootNode) {
    var rootNodeId = rootNode.root.nodeId;
    console.log('rootNode', rootNode, rootNodeId);
    return sendCommand(target, 'DOM.querySelector', {
      nodeId: rootNodeId,
      selector: selector
    })
    .then(function(node) {
      console.log('queried node:', node);
      return sendCommand(target, 'DOM.getBoxModel', node);
    })
    .then(function({model: model}) {
      console.log(model);
      var border = model.border;
      var topLeftX = border[0];
      var topLeftY = border[1];
      var width = model.width;
      var height = model.height;
      var clickEvent = {
        type: 'mousePressed',
        x: topLeftX + Math.round(width / 2),
        y: topLeftY + Math.round(height / 2),
        button: 'left',
        clickCount: 1
      };
      return sendCommand(target, 'Input.dispatchMouseEvent', clickEvent)
      .then(function() {
        clickEvent.type = 'mouseReleased';
        return sendCommand(target, 'Input.dispatchMouseEvent', clickEvent);
      });
    });
  });
}

var socket = {
  ws: null,
  open: function(url) {
		socket.ws = new WebSocket(url);
		socket.ws.onopen = socket.onOpen;
		socket.ws.onclose = socket.onClose;
		socket.ws.onmessage = socket.onMessage;
		socket.ws.onerror = socket.onError;
	},
	close: function() {
		if (socket.ws) {
			console.log('CLOSING ...');
			socket.ws.close();
		}
	},
	onOpen: function() {
		console.log('OPENED', socket.ws);
    window.setTimeout(function() {
      slackMessagePost('D1ENYA29G', 'hello there')
      .then(console.log)
      .catch(console.log);
    }, 2000);
	},
	onClose: function() {
		console.log('CLOSED');
		socket.ws = null;
	},
	onMessage: function(event) {
		var data = event.data;
		console.log('SOCKET event', event);
    try {
      var data = JSON.parse(event.data);
      var text = data.text;
      var channel = data.channel;
      if (text.toLowerCase().indexOf('paperspace invoice') !== -1) {
        slackMessagePost(channel, 'I can help with that...')
        .then(connectDebugger)
        .catch(console.log);
      }
    } catch(ex) {
      // do nothing
    }
	},
	onError: function(event) {
		console.error(event.data);
	}
};

var attachedTabs = {};
var version = "1.0";
var clickedTab;

chrome.debugger.onEvent.addListener(onEvent);
chrome.debugger.onDetach.addListener(onDetach);

chrome.browserAction.onClicked.addListener(function(tab) {
  clickedTab = tab; // TODO: make use the active tab instead
  setupSlack()
  .then(() => slackGet('rtm.connect'))
  .then(response => {
    console.log(response);
    socket.open(response.url);
  })
  .catch(err => console.error(err));
  return;
});
  
function connectDebugger() {
  var tabId = clickedTab.id;
  var debuggeeId = {tabId:tabId};
  console.log(debuggeeId);

  if (attachedTabs[tabId] == "pausing")
    return;

  if (!attachedTabs[tabId])
    chrome.debugger.attach(debuggeeId, version, onAttach.bind(null, debuggeeId));
  else if (attachedTabs[tabId])
    chrome.debugger.detach(debuggeeId, onDetach.bind(null, debuggeeId));
}

function onAttach(debuggeeId) {
  if (chrome.runtime.lastError) {
    alert(chrome.runtime.lastError.message);
    return;
  }

  var tabId = debuggeeId.tabId;
  chrome.browserAction.setIcon({tabId: tabId, path:"debuggerPausing.png"});
  chrome.browserAction.setTitle({tabId: tabId, title:"Pausing JavaScript"});
  attachedTabs[tabId] = "pausing";
  chrome.debugger.sendCommand(
      debuggeeId, "Debugger.enable", {},
      onDebuggerEnabled.bind(null, debuggeeId));
}

var CHROME_EXTENSION_ID = 'fodgacdkamnogglbgedijgabmcehimjb';
var SLACK = {
  AUTHORIZE_URL: 'https://slack.com/oauth/authorize',
  ACCESS_URL: 'https://slack.com/api/oauth.access',
  clientId: '5027724499.402338979777',
  // scope: 'identify,read,post,client',
  // scope: 'identify,files:write:user',
  scope: 'identify,client,post',
  redirectUri: `https://${CHROME_EXTENSION_ID}.chromiumapp.org`,
  buildAuthorizeUrl: ({ clientId, scope, redirectUri }) => `${SLACK.AUTHORIZE_URL}?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`,
  buildAccessUrl: ({ clientId, clientSecret, redirectUri, code }) => `${SLACK.ACCESS_URL}?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&code=${code}`
};
// load secrets
get(chrome.extension.getURL('config.json'))
.then(function(config) {
  SLACK.clientSecret = config.SLACK.clientSecret;
});

function setupSlack() {
  var {
    clientId,
    clientSecret,
    redirectUri,
    scope,
  } = SLACK;
  return launchWebAuthFlow({
    url: SLACK.buildAuthorizeUrl({ clientId, scope, redirectUri }),
    interactive: true
  })
  .then(redirectUrl => {
    console.log('redirectUrl', redirectUrl);
    // Get the query params from the provided redirect URL
    var query = redirectUrl.split('?')[1];
    // Extract the access code from the query params
    var code;
    query.split('&').forEach(function(pair) {
      var [key, value] = pair.split('=');
      if (key === 'code') {
        code = decodeURIComponent(value);
      }
    });
    console.log('code', code);
    var accessUrl = SLACK.buildAccessUrl({ clientId, clientSecret, redirectUri, code });
    // Resolve with the access token, or reject on error
    return get(accessUrl)
    .then(json => {
      SLACK.access_token = json.access_token;
      console.log('SLACK.access_token', SLACK.access_token);
    });
  });
}

function onDebuggerEnabled(debuggeeId) {
  Promise.resolve()
  .then(function() {
    return sendCommand(debuggeeId, 'Page.navigate', {
      url: 'https://www.paperspace.com/console/account/billing'
    });
  })
  // .then(function() {
  //   return setupSlack();
  // })
  .then(function() {
    return wait(5000).then(function() { return clickSelector(debuggeeId, 'button#loginButton'); });
  })
  .then(function() {
    return wait(10000).then(function() { return clickSelector(debuggeeId, 'button.small.blue'); });
  })
  .then(function() {
    return wait(10000).then(function() { return sendMessage(debuggeeId.tabId, {type: 'sizeRequest'}); });
  })
  .then(function(response) {
    console.log('response', response);
    var size = response.size;
    return sendCommand(debuggeeId,
      // could also printToPDF if this doesn't work?
      'Page.captureScreenshot', {
        clip: {
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
          scale: 1
        }
      }
    );
  })
  .then(function(response) {
    var data = response.data;
    console.log('response', response);
    console.log(debuggeeId);
    return sendMessage(debuggeeId.tabId, {
      type: "imageData",
      imageData: data
    })
    .then(function() {
      // Send to Slack
      return slackFilePost(data);
    })
    .then(function(response) {
      console.log('image post response', response);
    });
  })
  .then(function(response) {
    console.log('complete', response);
    chrome.debugger.detach(debuggeeId, onDetach.bind(null, debuggeeId));
  })
  .catch(function(ex) {
    console.log('General error', ex);
  });
}

function onEvent(debuggeeId, method) {
  var tabId = debuggeeId.tabId;
  if (method == "Debugger.paused") {
    attachedTabs[tabId] = "paused";
    chrome.browserAction.setIcon({tabId:tabId, path:"debuggerContinue.png"});
    chrome.browserAction.setTitle({tabId:tabId, title:"Resume JavaScript"});
  }
}

function onDetach(debuggeeId) {
  var tabId = debuggeeId.tabId;
  delete attachedTabs[tabId];
  chrome.browserAction.setIcon({tabId:tabId, path:"debuggerPause.png"});
  chrome.browserAction.setTitle({tabId:tabId, title:"Pause JavaScript"});
}
