/*:ja
* @plugindesc FlMML互換のMMLファイルを再生できるようにするプラグインです。
* @author Inaba Byakko
*
*
* @help
* ※注意
* 本プラグインの動作には、依存ライブラリ「FlMMLonHTML5」
* 「FlMMLWorker」が必要です。下のURLからダウンロードの
* 上、本プラグインより上の位置にインストールしてください。
* https://github.com/carborane3/FlMMLonHTML5
*
* また、デプロイメント時に「未使用ファイルを削除」オプション
* を使用した場合、アニメーションを含むフォルダは削除されて
* しまいます。必ず、デプロイメント後にプラグインパラメータで
* 指定したフォルダを、出力先の同じ位置にコピーしてください。
* 
* 【プラグインコマンド】
*
* MMLBGM再生 [ファイル名] [ボリューム]
*   # audio/bgm フォルダに保存されたMMLを再生します。
*   #
*   # (ファイル名の ".txt" 等は省略可能です。)
*   #  * オプション（これらの値は省略可能です）： 
*   #   - ボリューム: BGMを再生するボリューム　（0～127, 省略時は100）
*
* MMLBGMボリューム [ボリューム]
*   # BGMを再生するボリュームを設定　（0～127, 省略時は100）
*      \v[番号]　で変数の値を利用可能
*
* MMLBGM停止
*   # 再生したBGMを停止します。
*   
*/

(function () {
    function FlMMLMV() { }
    FlMMLMV.bgmDir = 'audio/bgm/';
    FlMMLMV.bgmBuffer = new FlMMLonHTML5('js/plugins/flmmlworker.js');

    //　プラグインコマンドパラメータオブジェクト
    FlMMLMV.MmlPlayerArguments = function() {
        this.filename = "";
        this.mml = "";
        this.loop = false;
        this.volume = 100;
    };
    FlMMLMV.bgmArgs = new FlMMLMV.MmlPlayerArguments();

    // 依存プラグイン導入チェック
    if (typeof FlMMLonHTML5 !== "function") {
        throw new Error(
            "Dependency plug-in 'FlMMLonHTML5' is not installed.");
    };

    // プラグインコマンドの定義
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        FlMMLMV.processCommands.call(this, command, args);
    };

    //　全角英数字記号を半角へ変換
    //　http://jquery.nj-clucker.com/change-double-byte-to-half-width/
    FlMMLMV.toHalfWidth = function(strVal) {
        var halfVal = strVal.replace(/[！-～]/g,
            function(tmpStr) {
                return String.fromCharCode(tmpStr.charCodeAt(0) - 0xFEE0);
            }
        );
        return halfVal.replace(/”/g, "\"").replace(/’/g, "'").replace(/‘/g, "`").replace(/￥/g, "\\").replace(/　/g, " ").replace(/〜/g, "~");
    };

    //　SSコマンドディスパッチャー
    FlMMLMV.processCommands = function (command, args) {
        switch (FlMMLMV.toHalfWidth(command).toUpperCase()) {
            case "MMLBGM再生":
            case "MMLPLAYBGM":
                FlMMLMV.processPlayBgm.call(this, args);
                break;
            case "MMLBGMボリューム":
            case "MMLPLAYVOLUME":
                FlMMLMV.processBgmVolume.call(this, args);
                break;
            case "MMLBGM停止":
            case "MMLSTOPBGM":
                FlMMLMV.processStopBgm.call(this, args);
                break;
        }
    };

    // MMLをロードして再生
    FlMMLMV.loadAndPlay = function(params, buffer, loop) {
        var xhr = new XMLHttpRequest();
        var url = FlMMLMV.bgmDir + params.filename;
        xhr.open('GET', url);
        xhr.overrideMimeType('text/plain');
        xhr.onload = function (buffer, params) {
            if (xhr.status < 400) {
                params.mml = xhr.responseText;
                buffer.play(params.mml);
            }
        } .bind(this, buffer, params);
        xhr.send();
    };
    
    // MMLBGMをもう一度再生
    FlMMLMV.replayBgm = function () {
        if (FlMMLMV.bgmArgs.mml == '')
            return;
        FlMMLMV.bgmBuffer.play(FlMMLMV.bgmArgs.mml);
    };
    FlMMLMV.bgmBuffer.addEventListener('complete', FlMMLMV.replayBgm);

    // BGMマスターボリューム調整
    FlMMLMV.updateBgmVolume = function(){
        FlMMLMV.bgmBuffer.setMasterVolume(Math.ceil(FlMMLMV.bgmArgs.volume * (AudioManager.bgmVolume)/100.0 ));
    };

    // マスターボリュームを変更したときにBGM音量を変更
    var _audioManager_updateBgmParameters = AudioManager.updateBgmParameters;
    AudioManager.updateBgmParameters = function(bgm) {
        _audioManager_updateBgmParameters.call(this, bgm);
        FlMMLMV.updateBgmVolume();
    };

    // MML再生
    FlMMLMV.processPlayBgm = function (args) {
        if (!args[0])
            return;
        FlMMLMV.bgmArgs.filename = args[0];
        if (!/\.txt$/i.test(FlMMLMV.bgmArgs.filename))
            FlMMLMV.bgmArgs.filename += ".txt";
        if (args[1]) {
            if ((/^v\[[0-9]+\]/i).test(args[1])) {
                FlMMLMV.bgmArgs.volume = $gameVariables.value((/^v\[([0-9]+)\]/i).exec(args[1])[1]);
            } else {
                FlMMLMV.bgmArgs.volume = Number(args[1]);
            }
        }
        FlMMLMV.bgmArgs.volume = Math.min(127, Math.max(0, FlMMLMV.bgmArgs.volume));
        FlMMLMV.loadAndPlay(FlMMLMV.bgmArgs, FlMMLMV.bgmBuffer, true);
        FlMMLMV.updateBgmVolume();
    };

    // BGMボリューム調整
    FlMMLMV.processBgmVolume = function (args) {
        if (!args[0])
            return;
        if ((/^\\v\[[0-9]+\]/i).test(args[0])) {
            FlMMLMV.bgmArgs.volume = $gameVariables.value((/^\\v\[([0-9]+)\]/i).exec(args[0])[1]);
        } else {
            FlMMLMV.bgmArgs.volume = Number(args[0]);
        }
        FlMMLMV.bgmArgs.volume = Math.min(127, Math.max(0, FlMMLMV.bgmArgs.volume));
        FlMMLMV.updateBgmVolume();
    };

    // BGMの停止
    FlMMLMV.processStopBgm = function (args) {
        FlMMLMV.bgmBuffer.stop();
    };

})();
