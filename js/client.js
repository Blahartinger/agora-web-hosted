const options = {
    appid: null,
    channel: null,
    token: null,
    uid: null,
    videoId: 0,
};
const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });

const localTracks = {
    videoTrack: null,
    audioTrack: null,
};

async function start() {
    const urlParams = new URL(location.href).searchParams;

    if (urlParams.get('debug')) {
        document.querySelector('#bridge-controls').style.display = 'block';
        document.querySelector('#bridge-set-collapsed').addEventListener('click', () => bridgeSetCollapsed(true), false);
        document.querySelector('#bridge-set-expanded').addEventListener('click', () => bridgeSetCollapsed(false), false);
        document.querySelector('#bridge-switch-camera').addEventListener('click', () => bridgeSwitchCamera(), false);
        document.querySelector('#bridge-enable-microphone').addEventListener('click', () => bridgeSetMicrophoneEnabled(true), false);
        document.querySelector('#bridge-disable-microphone').addEventListener('click', () => bridgeSetMicrophoneEnabled(false), false);
        document.querySelector('#bridge-enable-camera').addEventListener('click', () => bridgeSetCameraEnabled(true), false);
        document.querySelector('#bridge-disable-camera').addEventListener('click', () => bridgeSetCameraEnabled(false), false);
        document.querySelector('#bridge-leave').addEventListener('click', () => bridgeLeave(), false);
    }

    options.appid = urlParams.get('appid');
    options.channel = urlParams.get('channel');
    options.token = null;
    options.uid = urlParams.get('uid') || null;

    await startRecording();
    await joinChannel();
}

async function startRecording() {
    [localTracks.audioTrack, localTracks.videoTrack ] = await Promise.all([
        // create local tracks, using microphone and camera
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack({ })
    ]);

    const { item, bubble } = createParticipantView();
    item.id = 'local-item';
    localTracks.videoTrack.play(bubble);
    document.querySelector('#participants-container').appendChild(item);
}

async function stopRecording() {
    await localTracks.videoTrack.stop();
    await localTracks.audioTrack.stop();
}

async function joinChannel() {
    // Listen to events after joining
    agoraClient.on('user-joined', onUserJoined);
    agoraClient.on('user-published', onUserPublished);
    agoraClient.on('user-unpublished', onUserUnpublished);
    agoraClient.on('user-left', onUserLeft);

    // Join the channel
    options.uid = await agoraClient.join(options.appid, options.channel, options.token || null, options.uid);

    // Publish on the channel
    await agoraClient.publish(Object.values(localTracks));
}

function createParticipantView() {
    const item = document.createElement('div');
    item.className = 'participant-item';

    const bubble = document.createElement('div');
    bubble.className = 'participant-bubble';
    item.appendChild(bubble);

    const placeholder = document.createElement('div');
    placeholder.className = 'participant-placeholder';
    // TODO get the user's profile picture
    placeholder.style.backgroundImage = 'url("https://www.petage.com/wp-content/uploads/2019/09/Depositphotos_74974941_xl-2015-e1569443284386-670x627.jpg")';
    bubble.appendChild(placeholder);

    return { item, bubble };
}

async function onUserJoined(user) {
    const { item, bubble } = createParticipantView();
    item.id = `participant-item-${user.uid}`;
    item.classList.add('novideo');
    document.querySelector('#participants-container').appendChild(item);
}

async function onUserLeft(user, mediaType) {
    const item = document.querySelector(`#participant-item-${user.uid}`);
    if (item) {
        item.parentNode.removeChild(item);
    }
}

async function onUserPublished(user, mediaType) {
    await agoraClient.subscribe(user, mediaType);

    if (mediaType === 'video') {
        const item = document.querySelector(`#participant-item-${user.uid}`);
        user.videoTrack.play(item.querySelector('.participant-bubble'));

        item.classList.remove('novideo');
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

async function onUserUnpublished(user, mediaType) {
    if (mediaType !== 'video') return;

    const item = document.querySelector(`#participant-item-${user.uid}`);
    item.classList.add('novideo');

    console.log('no more video');
}

async function bridgeSwitchCamera() {
    const devices = await AgoraRTC.getDevices();

    const videoDevices = devices.filter(function(device){
        return device.kind === "videoinput";
    });

    options.videoId = (options.videoId + 1) % (videoDevices.length);

    const selectedCameraId = videoDevices[options.videoId].deviceId;
    await localTracks.videoTrack.setDevice(selectedCameraId);
}

async function bridgeSetCollapsed(collapsed) {
    document.body.className = collapsed ? 'collapsed' : 'expanded';
}

async function bridgeSetMicrophoneEnabled(enabled) {
    const { audioTrack } = localTracks;
    if (!audioTrack) return;
    audioTrack.setEnabled(enabled);
}

async function bridgeSetCameraEnabled(enabled) {
    const { videoTrack } = localTracks;
    if (!videoTrack) return;
    videoTrack.setEnabled(enabled);

    const item = document.querySelector('#local-item');
    if (enabled) {
        item.classList.remove('novideo')
    } else {
        item.classList.add('novideo')
    }
}

async function bridgeLeave() {
    await Promise.all([
        stopRecording(),
        agoraClient.leave(),
    ]);

    // TODO maybe fire a callback so the native side knows?
}

window.addEventListener('load', () => {
    start();
}, false);
