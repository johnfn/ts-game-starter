export const SetAudioToLoop = (audio: HTMLAudioElement) => {
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    audio.play();
  });

  return audio;
}