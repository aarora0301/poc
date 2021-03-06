//connecting to our signaling server
var conn = new WebSocket('ws://localhost:8080/socket');

var sendQueue = [];

conn.onopen = function() {
    console.log("Connected to the signaling server");
    initialize();
    navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
};

conn.onmessage = function(msg) {
    console.log("Got message", msg.data);
    var content = JSON.parse(msg.data);
    var data = content.data;
    switch (content.event) {
    // when somebody wants to call us
    case "offer":
        handleOffer(data);
        console.log("Handle offer")
        break;
    case "answer":
        handleAnswer(data);
         console.log("Handle answer")
        break;
    // when a remote peer sends an ice candidate to us
    case "candidate":
        handleCandidate(data);
         console.log("Handle candidate")
        break;
    default:
        break;
    }
};

function send(message) {
    conn.send(JSON.stringify(message));
}

var peerConnection;
var dataChannel;
var input = document.getElementById("messageInput");

function initialize() {
    var configuration = null;

    peerConnection = new RTCPeerConnection(configuration);

    // Setup ice handling
    peerConnection.onicecandidate = function(event) {

        if (event.candidate) {
            send({
                event : "candidate",
                data : event.candidate
            });
        }
    };

    // creating data channel
    dataChannel = peerConnection.createDataChannel("dataChannel", {
        reliable : true
    });

    dataChannel.onerror = function(error) {
        console.log("Error occured on datachannel:", error);
    };

    // when we receive a message from the other peer, printing it on the console
    dataChannel.onmessage = function(event) {
        console.log("message:", event.data);
    };

    dataChannel.onclose = function() {
        console.log("data channel is closed");
    };

  	peerConnection.ondatachannel = function (event) {
        dataChannel = event.channel;
  	};


  	peerConnection.onaddstream = function(event) {
  	console.log("audio received")
        audio.srcObject = event.stream;
    };
}

function createOffer() {
    peerConnection.createOffer(function(offer) {
        send({
            event : "offer",
            data : offer
        });
        peerConnection.setLocalDescription(offer);
    }, function(error) {
        alert("Error creating an offer");
    });
}

function handleOffer(offer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // create and send an answer to an offer
    peerConnection.createAnswer(function(answer) {
        peerConnection.setLocalDescription(answer);
        send({
            event : "answer",
            data : answer
        });
    }, function(error) {
        alert("Error creating an answer");
    });

};

function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

function handleAnswer(answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("connection established successfully!!");
};

function sendMessage() {
//    console.log("data channel state", dataChannel.readyState)
//    dataChannel.send(input.value);
//    input.value = "";

  var msg = input.value
  console.log("message from Sender" , msg)
  console.log("Sender state" , dataChannel.readyState)
 switch(dataChannel.readyState) {
    case "connecting":
      console.log("Connection not open; queueing: " + msg);
      sendQueue.push(msg);
      break;
    case "open":
      //sendQueue.forEach((msg) => {
       dataChannel.send(msg)
      //};
      break;
    case "closing":
      console.log("Attempted to send message while closing: " + msg);
      break;
    case "closed":
      console.log("Error! Attempt to send while connection closed.");
      break;
  }

  input.value= "";
}

const audio = document.querySelector('audio');

const constraints = window.constraints = {
  audio: true,
  video: false
};

function handleSuccess(stream) {
  const audioTracks = stream.getAudioTracks();
  console.log('Got stream with constraints:', constraints);
  console.log('Using audio device: ' + audioTracks[0].label);
  stream.oninactive = function() {
    console.log('Stream ended');
  };
  window.stream = stream; // make variable available to browser console
  audio.srcObject = stream;
  peerConnection.addStream(stream);
  console.log("added")
}

function handleError(error) {
  const errorMessage = 'navigator.MediaDevices.getUserMedia error: ' + error.message + ' ' + error.name;
 // document.getElementById('errorMsg').innerText = errorMessage;
  console.log(errorMessage);
}
