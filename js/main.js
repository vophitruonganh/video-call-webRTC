let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
let localStream;
let peerConnection;
let remoteStream = new MediaStream();
let turnReady;

// const localVideo = document.querySelector("#localVideo");
let remoteVideo = document.querySelector("#remoteVideo");

const pcConfig = {
  iceServers: [{urls: 'turn:turn.tavozone.com:3478?transport=tcp', username: 'truonganh', credential: '12345'}]
};

// Set up audio and video regardless of what devices are present.
const sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

const room = "foo";
const socket = io.connect();

if (room !== "") {
  socket.emit("create or join", room);
  console.log("Attempted to create or  join room", room);
}

socket.on("created", function (room) {
  console.log("Created room " + room);
  isInitiator = true;
});

socket.on("full", function (room) {
  console.log("Room " + room + " is full");
});

socket.on("join", function (room) {
  console.log("Another peer made a request to join room " + room);
  console.log("This peer is the initiator of room " + room + "!");
  isChannelReady = true;
});

socket.on("joined", function (room) {
  console.log("joined: " + room);
  isChannelReady = true;
});

socket.on("log", function (array) {
  console.log.apply(console, array);
});

function sendMessage(message) {
  console.log("Client sending message: ", message);
  socket.emit("message", message);
}

// This client receives a message
socket.on("message", function (message) {
  console.log("Client received message:", message);
  if (message === "got user media") {
    maybeStart();
  } else if (message.type === "offer") {
    if (!isInitiator && !isStarted)
      maybeStart();

    peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === "answer" && isStarted) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === "candidate" && isStarted) {
    const candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate,
    });
    peerConnection.addIceCandidate(candidate);
  } else if (message === "bye" && isStarted) {
    handleRemoteHangup();
  }
});

navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then(gotStream)
  .catch(function (e) {
    alert("getUserMedia() error: " + e.name);
  });

function gotStream(stream) {
  console.log("Adding local stream.");
  localStream = stream;
  // localVideo.srcObject = stream;
  sendMessage("got user media");
  if (isInitiator) {
    maybeStart();
  }
}

const constraints = {
  video: true,
};

console.log("Getting user media with constraints", constraints);

function maybeStart() {
  console.log(">>>>>>> isStarted() ", isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== "undefined" && isChannelReady) {
    console.log(">>>>>> creating peer connection");
    createPeerConnection();

    peerConnection.addStream(localStream);
    isStarted = true;

    console.log("isInitiator", isInitiator);
    if (isInitiator) {
      doCall();
    }

  }
}

window.onbeforeunload = function () {
  isInitiator = false;
  isStarted = false;
  isChannelReady = false;
  sendMessage("bye");
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    peerConnection = new RTCPeerConnection(pcConfig);
    peerConnection.addEventListener("iceconnectionstatechange", ev => {
      console.log(`${peerConnection.iceConnectionState}-state`)

    }, false);
    peerConnection.onicecandidate = handleIceCandidate;
    peerConnection.onaddstream = handleRemoteStreamAdded;
    peerConnection.onremovestream = handleRemoteStreamRemoved;
    console.log("Created RTCPeerConnnection");
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create RTCPeerConnection object.");
  }
}

function handleIceCandidate(event) {
  console.log("icecandidate event: ", event);
  if (event.candidate) {
    sendMessage({
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
    });
  } else {
    console.log("End of candidates.");
  }
}

function handleCreateOfferError(event) {
  console.log("createOffer() error: ", event);
}

function doCall() {
  console.log("Sending offer to peer");
  peerConnection.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log("Sending answer to peer.");
  peerConnection.createAnswer()
    .then(
      setLocalAndSendMessage,
      onCreateSessionDescriptionError
    );
}

function setLocalAndSendMessage(sessionDescription) {
  peerConnection.setLocalDescription(sessionDescription);
  console.log("setLocalAndSendMessage sending message", sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  console.log("Failed to create session description: " + error.toString());
}

function requestTurn(turnURL) {
  let turnExists = false;
  for (let i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === "turn:") {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log("Getting TURN server from ", turnURL);
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const turnServer = JSON.parse(xhr.responseText);
        console.log("Got TURN server: ", turnServer);
        pcConfig.iceServers.push({
          urls: "turn:" + turnServer.username + "@" + turnServer.turn,
          credential: turnServer.password,
        });
        turnReady = true;
      }
    };
    xhr.open("GET", turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  const remoteMediaStream = event.stream;
  const remoteAudioStream = event.stream;

  if (remoteStream == null) {
    remoteStream = remoteMediaStream;
    remoteVideo.srcObject = remoteStream;
    remoteMediaStream.getVideoTracks().map(track => remoteStream.addTrack(track));
    remoteAudioStream.getAudioTracks().map(track => remoteStream.addTrack(track));
  } else {
    remoteVideo.srcObject = remoteStream;
    remoteMediaStream.getVideoTracks().map(track => remoteStream.addTrack(track));
    remoteAudioStream.getAudioTracks().map(track => remoteStream.addTrack(track));
  }
  console.log("New stream added");
  remoteVideo.play();
}


function handleRemoteStreamRemoved(event) {
  console.log("Remote stream removed. Event: ", event);
}

function hangup() {
  console.log("Hanging up.");
  stop();
  sendMessage("bye");
}

function handleRemoteHangup() {
  console.log("Session terminated.");
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  isInitiator = false;
  isChannelReady = false;
  peerConnection.close();

  peerConnection = null;
  socket.emit("create or join", room);
}
