/**
 * Created by Marek on 16. 3. 2015.
 */

var AudioAnalyser = (function () {
    var HIGHPASS_FREQ = 60,
        LOWPASS_FREQ = 4500,
        FFT_SIZE = 2048,
        BUFFER_LENGTH = FFT_SIZE / 2;

    var interpolationParabolic = function (y1, y2, y3) {
        return (y3 - y1) / (2 * (2 * y2 - y1 - y3));
    };

    var interpolationGaussian = function (y1, y2, y3) {
        return Math.log(y3/y1)/(2*Math.log((y2*y2) / (y1*y2)))
    };

    function AudioAnalyser(audioContext){
        this.INTERPOLATION_PARABOLIC = interpolationParabolic;
        this.INTERPOLATION_GAUSSIAN = interpolationGaussian;
        this.interpolate = this.INTERPOLATION_PARABOLIC;

        this.audioContext = audioContext;

        this.GAMMA = 0.985;
        this.FFT_MIN_DECIBELS = -65;
        this.FFT_SMOOTHING_TIME_CONSTANT = 0.9;

        this.onFrequencyChanged = function(noteInfo){};

        this.reset();
    }

    AudioAnalyser.prototype.reset = function(){
        if(this.frameID)
            cancelRequestAnimationFrame(this.frameID);

        this.buffer = new Float32Array( BUFFER_LENGTH );

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
        this.analyser.minDecibels = this.FFT_MIN_DECIBELS;
        this.analyser.smoothingTimeConstant = this.FFT_SMOOTHING_TIME_CONSTANT;

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
            bufferLength;

        bufferLength = buffer.length;

        var minIndex = Math.floor(HIGHPASS_FREQ / (sampleRate / 2) * bufferLength),
            maxIndex = Math.floor(LOWPASS_FREQ / (sampleRate / 2) * bufferLength);
        for (index = minIndex; index < bufferLength-1 && index < maxIndex; index++) {
            var gamma = Math.pow(this.GAMMA, index);
            buffer[index] -= this.analyser.minDecibels;

            // var value = buffer[index-1]*gamma + buffer[index]*gamma + buffer[index+1]*gamma;
            var value = buffer[index]*gamma;

            if(value > maxValue){
                maxValue = buffer[index];
                maxValueIndex = index;
            }
        }

        var y1 = maxValueIndex-1 < minIndex ? 0.0 : buffer[maxValueIndex-1],
            y2 = buffer[maxValueIndex],
            y3 = buffer[maxValueIndex+1];

        return (maxValueIndex + this.interpolate(y1, y2, y3)) / BUFFER_LENGTH * (sampleRate / 2);
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
        var i = Math.floor(HIGHPASS_FREQ / (this.audioContext.sampleRate / 2) * this.analyser.frequencyBinCount)
        for (; i < bins; i++) {
            var gamma = Math.pow(this.GAMMA, i);
            var value = freqDomain[i] * gamma;
            var percent = value / 256;
            var height = HEIGHT * percent;
            var offset = HEIGHT - height - 1;
            var barWidth = WIDTH/bins;
            var hue = i/bins * 360;
            drawContext.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
            drawContext.fillRect(i * barWidth, offset, barWidth, height);
        }

        var timeDomain = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(freqDomain);
        for (i = 0; i < bins; i++) {
            var value = timeDomain[i];
            var percent = value / 256;
            var height = HEIGHT * percent;
            var offset = HEIGHT - height - 1;
            var barWidth = WIDTH/bins;
            drawContext.fillStyle = 'black';
            drawContext.fillRect(i * barWidth, offset, 1, 1);
        }
    };

    return AudioAnalyser;
})();