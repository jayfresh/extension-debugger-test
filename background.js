// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Promise wrappers for chrome APIs
function sendCommand(target, command, params) {
  return new Promise(function(resolve, reject) {
    chrome.debugger.sendCommand(target, command, params, function(response) {
      resolve(response);
    });
  });
}
function executeScript(target) {
  return new Promise(function(resolve, reject) {
    chrome.tabs.executeScript(target, function(response) {
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


var attachedTabs = {};
var version = "1.0";

chrome.debugger.onEvent.addListener(onEvent);
chrome.debugger.onDetach.addListener(onDetach);

chrome.browserAction.onClicked.addListener(function(tab) {
  var tabId = tab.id;
  var debuggeeId = {tabId:tabId};

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
  // await openURL('https://www.paperspace.com/account/billing');
  // var button = await getSelector('button#login');
  // await button.click();
  // await pageLoad();
  // var invoiceLink = getSelector('[text="latest invoice"]');
  // await invoiceLink.click();
  // var pdfData = await capturePDF();
  
  executeScript({file: 'contentScript.js'})
  .then(function() {
    return sendMessage(debuggeeId.tabId, {type: "sizeRequest"});
  })
  .then(function(response) {
    console.log('response', response);
    var size = response.size;
    return sendCommand(debuggeeId,
      // could also printToPDF if this doesn't work?
      "Page.captureScreenshot", {
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
