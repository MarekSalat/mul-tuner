var MovingAverage =  (function () {
    function MovingAverage(size){
        this.size = size;
        this.buffer = new Float32Array(size); for (var i = 0; i < size; i++) this.buffer[i] = 0;
        this.lastPosition = 0;
        this.sum = 0;
        this.sizeCounter = 0;
    }

    MovingAverage.prototype.push = function (value) {
        if(isNaN(value))
            return this.getValue();

        if(this.sizeCounter < this.size)
            this.sizeCounter++;

        this.lastPosition = (this.lastPosition+1)%this.size;
        this.sum -= this.buffer[this.lastPosition];
        this.sum += value;
        this.buffer[this.lastPosition] = value;

        return this.getValue();
    };

    MovingAverage.prototype.getValue = function () {
        return this.sum / this.sizeCounter;
    };

    return MovingAverage;
})();

var NoteAnalyser = (function(){
    function NoteAnalyser(baseNotePitch, baseNoteMidiNumber){
        this.BASE_NOTE = baseNoteMidiNumber || 69;    // midi number for A4
        this.BASE_NOTE_PITCH = baseNotePitch || 440.0 ; // frequency for A4 [Hz]
        this.NOTES_PER_OCTAVE = 12;
        this.NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    }

    NoteAnalyser.prototype.getNoteFromFreq = function ( frequency ) {
        var noteNum = this.NOTES_PER_OCTAVE * (Math.log( frequency / this.BASE_NOTE_PITCH )/Math.log(2) );
        return Math.round( noteNum ) + this.BASE_NOTE;
    };

    NoteAnalyser.prototype.getFreqFromNote = function ( note ) {
        return this.BASE_NOTE_PITCH * Math.pow(2,(note - this.BASE_NOTE)/this.NOTES_PER_OCTAVE);
    };

    NoteAnalyser.prototype.getCentsFromFreq = function ( frequency, note ) {
        return Math.floor( 1200 * Math.log( frequency / this.getFreqFromNote( note ))/Math.log(2) );
    };

    NoteAnalyser.prototype.getNoteName = function(note){
        return this.NOTE_NAMES[note % 12];
    };

    NoteAnalyser.prototype.getPianoKeyIndex = function (note) {
        return note - 21;
    };

    NoteAnalyser.prototype.getOctave = function(note){
        return Math.floor(this.getPianoKeyIndex(note) / 12);
    };

    NoteAnalyser.prototype.getNoteInformation = function (frequency) {
        var note = this.getNoteFromFreq(frequency);
        return {
            frequency: frequency,               // Hz
            note: note,                         // MIDI number
            noteFreq: this.getFreqFromNote(note), // Hz
            cents: this.getCentsFromFreq(frequency, note),
            key: this.getPianoKeyIndex(note),   // from 0
            name: this.getNoteName(note),       // see. this.NOTE_NAMES
            octave: this.getOctave(note)        // piano octave from zero
        }
    };

    return NoteAnalyser;
})();

var AudioAnalyser = (function () {
    var HIGHPASS_FREQ = 50;
    var LOWPASS_FREQ = 4500;
    var FFT_SIZE = 2048;
    var BUFFER_LENGTH = FFT_SIZE / 2;

    function AudioAnalyser(audioContext){
        this.audioContext = audioContext;

        this.onFrequencyChanged = function(noteInfo){};

        this.reset();
    }

    AudioAnalyser.prototype.reset = function(){
        if(this.frameID)
            cancelRequestAnimationFrame(this.frameID);

        this.buffer = new Float32Array( BUFFER_LENGTH );
        this.hammingWindow = new Float32Array( BUFFER_LENGTH );
        this.uintBuffer = new Uint8Array( FFT_SIZE );

        this.frameID = null;
        this.analyser = null;
    };

    AudioAnalyser.prototype.connect = function (sourceNode){
        var lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = lowpass.LOWPASS;
        lowpass.frequency = LOWPASS_FREQ;
        lowpass.Q = 0.1;

        var highpass = this.audioContext.createBiquadFilter();
        highpass.type = highpass.HIGHPASS;
        highpass.frequency = HIGHPASS_FREQ;
        highpass.Q = 0.1;

        this.analyser  = this.audioContext.createAnalyser();
        this.analyser.fftSize = FFT_SIZE;
        //this.analyser.minDecibels = -60;
        //this.analyser.smoothingTimeConstant = 0.9;

        sourceNode.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(this.analyser);

        this.analyser.connect( this.audioContext.destination );
    };

    AudioAnalyser.prototype.analyse = function () {
        if (!this.analyser)
            return;

        var bestFrequency = this._findBestFreq(this.audioContext.sampleRate );

        if(bestFrequency > 0)
            this.onFrequencyChanged(bestFrequency);

        window.requestAnimationFrame( this.analyse.bind(this) );
        this.draw();
    };

    AudioAnalyser.prototype._findBestFreq = function ( sampleRate ) {
        var buffer = this.buffer;
        this.analyser.getFloatFrequencyData(buffer)
        var index, maxValue = -1,
            maxValueIndex = -1,
            bufferLength,
            freqSum = 0,
            fftSum = 0;

        bufferLength = buffer.length;

        var minIndex = Math.floor(HIGHPASS_FREQ / (sampleRate / 2) * bufferLength);
        for (index = minIndex; index < bufferLength; index++) {
            buffer[index] -= this.analyser.minDecibels;

            if(buffer[index] > maxValue){
                maxValue = buffer[index];
                maxValueIndex = index;
            }
        }

        for (index = maxValueIndex - 2; index < maxValueIndex + 3 && index < bufferLength; index++) {
            if(index > 0 && buffer[index] > 0.8 * maxValue){
                freqSum += index / BUFFER_LENGTH * (sampleRate / 2) * buffer[index];
                fftSum += buffer[index];
            }
        }

        return freqSum / fftSum;
    };

    AudioAnalyser.prototype.draw = function (){
        var canvas = document.getElementById("canvas");
        var drawContext = canvas.getContext("2d");
        var HEIGHT = canvas.height;
        var WIDTH = canvas.width;
        var bins = this.analyser.frequencyBinCount * 0.04;

        drawContext.clearRect ( 0 , 0 , canvas.width, canvas.height );

        var freqDomain = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqDomain);
        for (var i = 0; i < bins; i++) {
            var value = freqDomain[i];
            var percent = value / 256;
            var height = HEIGHT * percent;
            var offset = HEIGHT - height - 1;
            var barWidth = WIDTH/bins;
            var hue = i/bins * 360;
            drawContext.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
            drawContext.fillRect(i * barWidth, offset, barWidth, height);
        }

        //var timeDomain = new Uint8Array(this.analyser.frequencyBinCount);
        //this.analyser.getByteTimeDomainData(freqDomain);
        //for (var i = 0; i < bins; i++) {
        //    var value = timeDomain[i];
        //    var percent = value / 256;
        //    var height = HEIGHT * percent;
        //    var offset = HEIGHT - height - 1;
        //    var barWidth = WIDTH/bins;
        //    drawContext.fillStyle = 'black';
        //    drawContext.fillRect(i * barWidth, offset, 1, 1);
        //}
    };

    return AudioAnalyser;
})();


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

        if(sourceNode && sourceNode.stop)
            sourceNode.stop(0);
        sourceNode = null;
    };

    gui.add({note: "e"}, "note", ["he", "h", "g", "d", "a", "e", "aa"])
       .name("play note")
        .onFinishChange(function (note) {
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

    gui.add({pitch: notes.BASE_NOTE_PITCH}, 'pitch')
       .min(27.5)
       .max(4189)
       .onFinishChange(function (frequency) {
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

        gui.add({reset: reset}, "reset");
    });
});
