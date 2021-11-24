var Utils = require("../global_script/utils");
var cv = require("../global_script/opencv_454");
//var cv = typeof window !== "undefined" && typeof window.cv !== "undefined" ? window.cv : null;

function main(param) {
    var scene = new g.Scene({
        game: g.game,
        // このシーンで利用するアセットのIDを列挙し、シーンに通知します
        assetIds: ["player", "shot", "se", "none", "hand", "haarcascade_frontalface_default"]
    });
    scene.onLoad.add(function () {
        var playerImageAsset = scene.asset.getImageById("player");
        if (cv) {
            // 以下、webカメラからの描画
            var cameraShotWidth = g.game.width / 8;
            var cameraShotHeight = g.game.height / 8;
            var cameraSprite = new g.Sprite({
                scene: scene,
                src: scene.asset.getImageById("none"), // 初期値はnullにしたいがsrcを指定する必要があるので非常に小さい画像アセットを指定する
                width: cameraShotWidth,
                height: cameraShotHeight
            });
            scene.append(cameraSprite);
            var videoElem = document.createElement('video');
            videoElem.width = cameraShotWidth;
            videoElem.height = cameraShotHeight;
            var videoCapture = new cv.VideoCapture(videoElem);
            var matSrc = null;
            var matDst = null;
            var handCascade = new cv.CascadeClassifier();
            let utils = new Utils('errorMessage');
            utils.createFileFromUrl("hand.xml", scene.asset.getTextById("hand").originalPath, () => {
                handCascade.load("hand.xml"); // in the callback, load the cascade from file 
            });
            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            }).then(stream => {
                videoElem.srcObject = stream;
                videoElem.play();
                matSrc = new cv.Mat(videoElem.height, videoElem.width, cv.CV_8UC4);  // For Video Capture
                matDst = new cv.Mat(videoElem.height, videoElem.width, cv.CV_8UC1);  // For Canvas Preview
                scene.setInterval(()=>{
                    videoCapture.read(matSrc);
                    //cv.cvtColor(matSrc, matDst, cv.COLOR_RGBA2GRAY, 0);
                    //console.log(detectHands(matSrc, handCascade));

                    detectHands(matSrc, handCascade).forEach(hand => {
                        let point1 = new cv.Point(hand.x, hand.y);
                        let point2 = new cv.Point(hand.x + hand.width, hand.y + hand.height);
                        cv.rectangle(matSrc, point1, point2, [255, 0, 0, 255]);
                    });
                    console.log(matSrc);
                    cameraSprite._surface = createSurfaceFromMat(matSrc, cameraShotWidth, cameraShotHeight);
                    cameraSprite.modified();
                }, 33);
            }).catch(err => console.error(err));
        }
        // ここからゲーム内容を記述します
        // 各アセットオブジェクトを取得します
        var shotImageAsset = scene.asset.getImageById("shot");
        var seAudioAsset = scene.asset.getAudioById("se");
        // プレイヤーを生成します
        var player = new g.Sprite({
            scene: scene,
            src: playerImageAsset,
            width: playerImageAsset.width,
            height: playerImageAsset.height
        });
        // プレイヤーの初期座標を、画面の中心に設定します
        player.x = (g.game.width - player.width) / 2;
        player.y = (g.game.height - player.height) / 2;
        player.onUpdate.add(function () {
            // 毎フレームでY座標を再計算し、プレイヤーの飛んでいる動きを表現します
            // ここではMath.sinを利用して、時間経過によって増加するg.game.ageと組み合わせて
            player.y = (g.game.height - player.height) / 2 + Math.sin(g.game.age % (g.game.fps * 10) / 4) * 10;
            // プレイヤーの座標に変更があった場合、 modified() を実行して変更をゲームに通知します
            player.modified();
        });
        // 画面をタッチしたとき、SEを鳴らします
        scene.onPointDownCapture.add(function () {
            seAudioAsset.play();
            // プレイヤーが発射する弾を生成します
            var shot = new g.Sprite({
                scene: scene,
                src: shotImageAsset,
                width: shotImageAsset.width,
                height: shotImageAsset.height
            });
            // 弾の初期座標を、プレイヤーの少し右に設定します
            shot.x = player.x + player.width;
            shot.y = player.y;
            shot.onUpdate.add(function () {
                // 毎フレームで座標を確認し、画面外に出ていたら弾をシーンから取り除きます
                if (shot.x > g.game.width)
                    shot.destroy();
                // 弾を右に動かし、弾の動きを表現します
                shot.x += 10;
                // 変更をゲームに通知します
                shot.modified();
            });
            scene.append(shot);
        });
        scene.append(player);
        // ここまでゲーム内容を記述します
    });
    g.game.pushScene(scene);
}

function detectHands(src, handCascade) {
    var gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    var hands = new cv.RectVector();
    var msize = new cv.Size(0, 0);
    handCascade.detectMultiScale(gray, hands, 1.1, 3, 0, msize, msize);
    var handsArray = [];
    for (var i = 0; i < hands.size(); ++i) {
        handsArray.push(hands.get(i));
    }
    gray.delete();
    hands.delete();
    return handsArray;
}

function createSurfaceFromMat(mat, width, height) {
    var img = new cv.Mat();
    var depth = mat.type() % 8;
    var scale = depth <= cv.CV_8S ? 1 : depth <= cv.CV_32S ? 1 / 256 : 255;
    var shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128 : 0;
    mat.convertTo(img, cv.CV_8U, scale, shift);
    switch (img.type()) {
        case cv.CV_8UC1:
            cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA);
            break;
        case cv.CV_8UC3:
            cv.cvtColor(img, img, cv.COLOR_RGB2RGBA);
            break;
        case cv.CV_8UC4:
            break;
        default:
            throw new Error("Bad number of channels (Source image must have 1, 3 or 4 channels)");
    }
    var imgData = new ImageData(new Uint8ClampedArray(img.data),img.cols,img.rows);
    var surface = g.game.resourceFactory.createSurface(width, height);
    var canv = document.createElement('canvas');
    canv.width = width;
    canv.height = height;
    var ct = canv.getContext('2d');
    ct.putImageData(imgData, 0, 0);
    surface._drawable = canv;
    return surface;
}

module.exports = main;
