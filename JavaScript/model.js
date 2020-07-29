window.addEventListener('load', async () => {
    const modelPath = `${window.location.href}assets/model.json`;
    const model = await tf.loadLayersModel(modelPath);

    const logElm = document.getElementById('log');
    logElm.innerText += `Using Platform: ${tf.getBackend()}\n\n`;

    let sensorData = {
        // データ取得開始時刻を格納
        // date: null,

        // デバイスの向き（角度）
        // do_absolute: null,
        // do_alpha: null,
        do_beta: null,
        do_gamma: null,

        // 加速度（重力含まず）
        // acc_g_x: null,
        // acc_g_y: null,
        // acc_g_z: null,

        // 加速度（重力含む）
        acc_x: null,
        acc_y: null,
        acc_z: null,

        // 回転速度
        // rot_alpha: null,
        rot_beta: null,
        rot_gamma: null
    };

    let outlier = [];

    // 推論に使うデータ構造を格納する変数
    let preproData = null;

    // 各テンソルを格納しておくスタック
    let acc_tensor = [[]];
    let do_tensor = [[]];
    let rot_tensor = [[]];
    let acc_z_tensor = [[]];


    const sleep = (mSec) => new Promise(resolve => setTimeout(resolve, mSec));



    (async () => {
        const sleepMSec = 200;
        let isCollectSensor = true;

        while (isCollectSensor) {
            // センサデータの加工を行ってデータ構造を作成する
            prepro(JSON.parse(JSON.stringify(sensorData)));

            // データが 10 個揃ったら推論を始める
            // キューを用意し、一つずつずらしながら推論のデータ構造を作成する
            if (preproData !== null) {
                motionEstimation();
            }

            await sleep(sleepMSec);
        }
    })();

    const motionEstimation = async () => {
        const pred = await model.predict(preproData);
        const pred_data = pred.dataSync();
        changeActionText(result(pred_data));

        // 推定データのログ表示
        logElm.innerText += `0: ${pred_data[0]}   |   1: ${pred_data[1]}   |    2: ${pred_data[2]}   |   3: ${pred_data[3]}\n`;
        logElm.innerText += `--------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n`;
        logElm.scrollTop = logElm.scrollHeight;
    };

    const changeActionText = (pred_index) => {
        const actionText = ['直立、着席', '歩行', '階段（上り下り）', '寝ている'];
        const actionTextElm = document.getElementById('action');
        actionTextElm.textContent = actionText[pred_index];  //結果
    };



    window.addEventListener('deviceorientation', (event) => {
        event.preventDefault();
        // sensorData.do_absolute = (event.absolute !== null) ? event.absolute : false;
        // sensorData.do_alpha = event.alpha;
        sensorData.do_beta = event.beta;
        sensorData.do_gamma = event.gamma;
    }, true);

    window.addEventListener('devicemotion', (event) => {
        event.preventDefault();
        // sensorData.acc_g_x = event.accelerationIncludingGravity.x;
        // sensorData.acc_g_y = event.accelerationIncludingGravity.y;
        // sensorData.acc_g_z = event.accelerationIncludingGravity.z;
        sensorData.acc_x = event.acceleration.x;
        sensorData.acc_y = event.acceleration.y;
        sensorData.acc_z = event.acceleration.z;
        // sensorData.rot_alpha = event.rotationRate.alpha;
        sensorData.rot_beta = event.rotationRate.beta;
        sensorData.rot_gamma = event.rotationRate.gamma;
    }, true);


    function prepro(data) {
        const acc = Math.sqrt(Math.pow(data.acc_x, 2) + Math.pow(data.acc_y, 2) + Math.pow(data.acc_z, 2));
        const acc_z_prepro = data.acc_z + 26;

        const acc_fin = acc / 319.57;
        const acc_z_fin = (acc_z_prepro - 7) / (51 - 7);

        const do_beta_fin = (data.do_beta + 180) / 360;
        const do_gamma_fin = (data.do_gamma + 90) / 180;

        const rot_beta_fin = (data.rot_beta + 300) / 600;
        const rot_gamma_fin = (data.rot_gamma + 300) / 600;


        if ((acc_fin > 319.57 || acc_fin < 0)
            || (acc_z_fin > 51) || (acc_z_fin < 7)
            || (rot_beta_fin > 600) || (rot_beta_fin < 0)
            || (rot_gamma_fin > 600) || (rot_gamma_fin) < 0) {
            outlier.push(JSON.parse(JSON.stringify(data)))
        }


        else {
            acc_tensor[0].push([acc_fin]);
            do_tensor[0].push([do_beta_fin, do_gamma_fin]);
            rot_tensor[0].push([rot_beta_fin, rot_gamma_fin]);
            acc_z_tensor[0].push([acc_z_fin]);

            if (acc_tensor[0].length > 10) {
                acc_tensor[0].shift();
                do_tensor[0].shift();
                rot_tensor[0].shift();
                acc_z_tensor[0].shift();

                // データが 10 個格納されたら推論が行えるので preproData にデータを格納する
                preproData = [tf.tensor(acc_tensor), tf.tensor(do_tensor), tf.tensor(rot_tensor), tf.tensor(acc_z_tensor)];
            }
        }
    }

    function result(a) {
        let index = 0;
        let value = -Infinity;

        for (let i = 0, l = a.length; i < l; i++) {
            if (value < a[i]) {
                value = a[i];
                index = i;
            }
        }

        return index;
    }
});