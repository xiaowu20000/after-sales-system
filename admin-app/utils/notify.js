let notifyAudio = null;
let boundErrorHandler = false;
let srcIndex = 0;
let plusPlayer = null;

const SOUND_SRCS = ['/static/notify.wav', '_www/static/notify.wav', 'static/notify.wav'];
let cachedAppSoundSrc = '';

function getAppSoundSrc() {
  // #ifdef APP-PLUS
  if (cachedAppSoundSrc) {
    return cachedAppSoundSrc;
  }
  try {
    cachedAppSoundSrc = plus.io.convertLocalFileSystemURL('_www/static/notify.wav');
    if (cachedAppSoundSrc) {
      return cachedAppSoundSrc;
    }
  } catch (error) {
    // ignore
  }
  cachedAppSoundSrc = '_www/static/notify.wav';
  return cachedAppSoundSrc;
  // #endif
  return SOUND_SRCS[srcIndex];
}

function ensureNotifyAudio() {
  if (notifyAudio) {
    return notifyAudio;
  }

  notifyAudio = uni.createInnerAudioContext();
  notifyAudio.autoplay = false;
  notifyAudio.loop = false;
  notifyAudio.volume = 1;

  try {
    notifyAudio.obeyMuteSwitch = false;
  } catch (error) {
    // Some platforms do not expose this field.
  }

  if (!boundErrorHandler) {
    notifyAudio.onError(() => {
      if (srcIndex < SOUND_SRCS.length - 1) {
        srcIndex += 1;
        notifyAudio.src = SOUND_SRCS[srcIndex];
        notifyAudio.play();
        return;
      }
      // #ifdef APP-PLUS
      tryPlayByPlusAudio();
      // #endif
    });
    boundErrorHandler = true;
  }

  return notifyAudio;
}

export function playNotifySound() {
  try {
    const audio = ensureNotifyAudio();
    // #ifdef APP-PLUS
    audio.src = getAppSoundSrc();
    // #endif
    // #ifndef APP-PLUS
    audio.src = SOUND_SRCS[srcIndex];
    // #endif
    audio.stop();
    if (typeof audio.seek === 'function') {
      audio.seek(0);
    }
    audio.play();
    // #ifdef APP-PLUS
    try {
      plus.device.vibrate(50);
    } catch (e) {
      // ignore
    }
    // #endif
  } catch (error) {
    // #ifdef APP-PLUS
    tryPlayByPlusAudio();
    // #endif
  }
}

// #ifdef APP-PLUS
function tryPlayByPlusAudio() {
  try {
    if (!plusPlayer) {
      plusPlayer = plus.audio.createPlayer(getAppSoundSrc());
    }
    plusPlayer.stop();
    plusPlayer.play(
      () => {},
      () => {
        try {
          plus.device.beep(1);
        } catch (e) {
          // ignore
        }
      },
    );
    try {
      plus.device.vibrate(80);
    } catch (e) {
      // ignore
    }
  } catch (error) {
    try {
      plus.device.beep(1);
      plus.device.vibrate(80);
    } catch (fallbackError) {
      // ignore
    }
  }
}
// #endif

export function destroyNotifySound() {
  if (!notifyAudio) {
    // #ifdef APP-PLUS
    if (plusPlayer) {
      try {
        plusPlayer.stop();
      } catch (error) {
        // ignore
      }
      plusPlayer = null;
    }
    // #endif
    return;
  }

  try {
    notifyAudio.destroy();
  } catch (error) {
    // ignore
  }

  notifyAudio = null;
  boundErrorHandler = false;
  srcIndex = 0;
  cachedAppSoundSrc = '';
  // #ifdef APP-PLUS
  if (plusPlayer) {
    try {
      plusPlayer.stop();
    } catch (error) {
      // ignore
    }
    plusPlayer = null;
  }
  // #endif
}
