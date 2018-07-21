var width = document.documentElement.scrollWidth;
var height = document.documentElement.scrollHeight;
console.log
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    console.log(request);
    if (request.type === "sizeRequest") {
      sendResponse({size: {
        width: width,
        height: height
      }});
    } else if (request.type === "imageData") {
      sendResponse({response: "received"});
      var imageData = request.imageData;
      var a = document.createElement('a');
      // a.href = 'data:application/octet-stream;base64,' + pdfData;
      a.href = 'data:image/png;base64,' + imageData;
      a.download = 'invoice.png'; // set the file name
      a.appendChild(document.createTextNode('click me to download screenshot of ' + window.location));
      document.body.appendChild(a);
      alert('see console');
      console.log(a);
      a.click(); //this is probably the key - simulatating a click on a download link
    }
  }
);
