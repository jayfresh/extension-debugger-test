// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO: stop using pauses and use network detection or messaging with the content script
// to tell when things have stopped loading
// TODO: make the clicking more robust - use the content script?

// Promise wrappers for chrome APIs
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


var attachedTabs = {};
var version = "1.0";

chrome.debugger.onEvent.addListener(onEvent);
chrome.debugger.onDetach.addListener(onDetach);

chrome.browserAction.onClicked.addListener(function(tab) {
  var tabId = tab.id;
  var debuggeeId = {tabId:tabId};
  console.log(debuggeeId);

  if (attachedTabs[tabId] == "pausing")
    return;

  if (!attachedTabs[tabId])
    chrome.debugger.attach(debuggeeId, version, onAttach.bind(null, debuggeeId));
  else if (attachedTabs[tabId])
    chrome.debugger.detach(debuggeeId, onDetach.bind(null, debuggeeId));
});

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

function onDebuggerEnabled(debuggeeId) {
  Promise.resolve()
  .then(function() {
    return sendCommand(debuggeeId, 'Page.navigate', {
      url: 'https://www.paperspace.com/console/account/billing'
    });
  })
  // .then(function() {
  //   return wait(5000).then(function() { return clickSelector(debuggeeId, 'button#login'); });
  // })
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
    });
  })
  .then(function(response) {
    console.log(response);
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
