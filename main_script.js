const videos = [
    "https://assets.mixkit.co/videos/47627/47627-720.mp4",
    "https://assets.mixkit.co/videos/50111/50111-720.mp4",
    "https://assets.mixkit.co/videos/42666/42666-720.mp4",
    "https://assets.mixkit.co/videos/42664/42664-720.mp4"
];

const video1 = document.querySelector(".video1");
const video2 = document.querySelector(".video2");

let idx = 0;
let showing_vid1 = true;

function play(video_element, src) {
    video_element.src = src;
    video_element.load();
    video_element.play();
}

function next_video() {
    idx = (idx + 1) % videos.length;
    
    if(showing_vid1) {
        play(video2, videos[idx]);
        video2.style.opacity = "1";
        video1.style.opacity = "0";
    } else {
        play(video1, videos[idx])
        video1.style.opacity = "1";
        video2.style.opacity = "0";
    }

    showing_vid1 = !showing_vid1;
}

play(video1, videos[idx]);

video1.addEventListener("ended", next_video);
video2.addEventListener("ended", next_video);


