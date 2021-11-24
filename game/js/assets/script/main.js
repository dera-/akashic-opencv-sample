window.gLocalAssetContainer["main"] = function(g) { (function(exports, require, module, __filename, __dirname) {
//var cv = require("opencv");

function main(param) {
    var scene = new g.Scene({
        game: g.game,
        // このシーンで利用するアセットのIDを列挙し、シーンに通知します
        assetIds: ["player", "shot", "se"]
    });
    scene.onLoad.add(function () {
        var playerImageAsset = scene.asset.getImageById("player");
        if (typeof window !== "undefined" && typeof window.cv !== "undefined") {
            let cv = window.cv;
            let dst = new cv.Mat();
            //console.log(playerImageAsset.originalPath);
            let src = cv.imread(playerImageAsset.asSurface()._drawable);
            console.log(src);
            cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
            //cv.imshow('canvasOutput', dst);
            // 以下描画
            var surface = createSurfaceFromMat(dst, playerImageAsset.width, playerImageAsset.height);
            var player0 = new g.Sprite({
                scene: scene,
                src: surface,
                width: playerImageAsset.width,
                height: playerImageAsset.height
            });
            scene.append(player0);

            // 以下、webカメラからの描画
            var cameraSprite = new g.Sprite({
                scene: scene,
                src: surface,
                width: g.game.width/2,
                height: g.game.height/2,
                x: g.game.width/4,
                y: g.game.height/4
            });
            scene.append(cameraSprite);
            var videoElem = document.createElement('video');
            var videoCapture = new cv.VideoCapture(videoElem);
            let matSrc = null;
            let matDst = null;
            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            }).then(stream => {
                videoElem.srcObject = stream;
                videoElem.play();
                matSrc = new cv.Mat(g.game.height, g.game.width, cv.CV_8UC4);  // For Video Capture
                matDst = new cv.Mat(g.game.height, g.game.width, cv.CV_8UC1);  // For Canvas Preview
            });
            setInterval(function() {
                videoCapture.read(matSrc);
                cv.cvtColor(matSrc, matDst, cv.COLOR_RGBA2GRAY);
                cameraSprite.surface = createSurfaceFromMat(matDst, g.game.width/2, g.game.height/2);
                cameraSprite.modified();
              }, 33);
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

})(g.module.exports, g.module.require, g.module, g.filename, g.dirname);
}