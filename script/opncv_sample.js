let src = cv.imread('canvasInput');
let gray = new cv.Mat();
cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
let hands = new cv.RectVector();
let handCascade = new cv.CascadeClassifier();
// load pre-trained classifiers
handCascade.load('haarcascade_frontalhand_default.xml');
// detect hands
let msize = new cv.Size(0, 0);
handCascade.detectMultiScale(gray, hands, 1.1, 3, 0, msize, msize);
for (let i = 0; i < hands.size(); ++i) {
    let roiGray = gray.roi(hands.get(i));
    let point1 = new cv.Point(hands.get(i).x, hands.get(i).y);
    let point2 = new cv.Point(hands.get(i).x + hands.get(i).width,
                              hands.get(i).y + hands.get(i).height);
    cv.rectangle(src, point1, point2, [255, 0, 0, 255]);
    roiGray.delete();
}
// cv.imshow('canvasOutput', src);
src.delete();
gray.delete();
handCascade.delete();
hands.delete();