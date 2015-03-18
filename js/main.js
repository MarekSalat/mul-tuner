$(function(){
    var buffer;
    var sourceNode;

    var notes = new NoteAnalyser();

    var gui = new dat.GUI();

    var audioInput = {id: null};
    var noteBuffer = {"he": null, "h": null, "g": null, "d": null, "a": null, "e": null, "aa": null};
    var movingAverage = new MovingAverage(1);

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var audioContext = new AudioContext();
    var analyser = new AudioAnalyser(audioContext);

    var request = new XMLHttpRequest();
    request.open("GET", "res/whistling3.ogg", true);
    request.responseType = "arraybuffer";
    request.onload = function() {
        analyser.audioContext.decodeAudioData( request.response, function(_buffer) {
            buffer = _buffer;
        } );
    };
    request.send();

    analyser.onFrequencyChanged = function (frequency) {
        var result = notes.getNoteInformation(movingAverage.push(frequency));
        $("#debug").text(JSON.stringify(result,null,2));
    };

    var reset = function () {
        if (!!window.stream)
            window.stream.stop();
        window.stream = null;
        if(analyser)
            analyser.reset();

        if(sourceNode && sourceNode.stop)
            sourceNode.stop(0);
        sourceNode = null;
    };

    gui.add({stop: reset}, "stop");

    var settingFolder = gui.addFolder("Setting");
    settingFolder.add(analyser, "GAMMA").min(0.8).max(1);
    settingFolder.add({windowSize:movingAverage.size}, "windowSize").step(1).min(1).max(32).name("AVG window size").onFinishChange(function(value){
        movingAverage = new MovingAverage(value);
    });
    settingFolder.add({i: "Parabolic"}, "i", ["Parabolic", "Gaussian"]).name("FFT interpolation").onFinishChange(function (value) {
        if (value === "Parabolic")
            analyser.interpolate = analyser.INTERPOLATION_PARABOLIC;
        else if (value === "Gaussian")
            analyser.interpolate =  analyser.INTERPOLATION_GAUSSIAN;
    });
    settingFolder.add(analyser, "FFT_MIN_DECIBELS").step(1).min(-100).max(-27.2101).name("FFT min decibels").onFinishChange(reset.bind(this));
    settingFolder.add(analyser, "FFT_SMOOTHING_TIME_CONSTANT").min(0.5).max(1).name("FFT smoothing").onFinishChange(reset.bind(this));

    gui.add({note: "e"}, "note", ["he", "h", "g", "d", "a", "e", "aa"]).name("Note to play").onFinishChange(function (note) {
        var play = function (){
            reset();

            sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = noteBuffer[note];
            sourceNode.loop = true;

            analyser.connect(sourceNode);
            sourceNode.start(0);
            analyser.analyse();
        };
        if(!noteBuffer[note]) {
            var request = new XMLHttpRequest();
            request.open("GET", "res/"+note+".ogg", true);
            request.responseType = "arraybuffer";
            request.onload = function() {
                analyser.audioContext.decodeAudioData( request.response, function(_buffer) {
                    noteBuffer[note] = _buffer;
                    play();
                } );
            };
            request.send();
            return;
        }

        play();
    });

    gui.add({pitch: notes.BASE_NOTE_PITCH}, 'pitch').min(27.5).max(4189).onFinishChange(function (frequency) {
            reset();

            sourceNode = audioContext.createOscillator();
            sourceNode.type = 'sine';
            sourceNode.frequency.value = frequency;

            analyser.connect(sourceNode);
            sourceNode.start(0);
            analyser.analyse();
        });

    gui.add({whistle: function(){
        reset();

        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.loop = true;

        analyser.connect(sourceNode);
        sourceNode.start(0);
        analyser.analyse();
    }}, "whistle");

    gui.add({live: function () {
        reset();
        var config ={
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": audioInput.id ? [{sourceId: audioInput.id}] : []
            }
        };

        navigator.getUserMedia =
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;

        try {
            navigator.getUserMedia(config, function (stream) {
                window.stream = stream;
                sourceNode = audioContext.createMediaStreamSource(stream);

                analyser.connect(sourceNode);
                analyser.analyse();
            }, function (e){
                // error
            });
        } catch (e) {
            alert('getUserMedia threw exception :' + e);
        }
    }}, "live");

    MediaStreamTrack.getSources(function (sourceInfos) {
        var options = {};
        for (var i = 0; i !== sourceInfos.length; ++i) {
            var sourceInfo = sourceInfos[i];

            if (sourceInfo.kind === 'audio') {
                options[sourceInfo.label || 'microphone '+(i)] =  sourceInfo.id;
            }
        }

        gui.add(audioInput, "id", options).name("audio input");
    });
});