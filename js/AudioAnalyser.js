/**
 * Created by Marek on 16. 3. 2015.
 */

var AudioAnalyser = (function () {
    var interpolationParabolic = function (y1, y2, y3) {
        return (y3 - y1) / (2 * (2 * y2 - y1 - y3));
    };

    var interpolationGaussian = function (y1, y2, y3) {
        return Math.log(y3/y1)/(2*Math.log((y2*y2) / (y1*y2)))
    };

    function AudioAnalyser(audioContext){
        this.HIGHPASS_FREQ = 60;
        this.LOWPASS_FREQ = 4500;
        this.FFT_SIZE = 2048;
        this.BUFFER_LENGTH = this.FFT_SIZE / 2;

        this.INTERPOLATION_PARABOLIC = interpolationParabolic;
        this.INTERPOLATION_GAUSSIAN = interpolationGaussian;
        this.interpolate = this.INTERPOLATION_PARABOLIC;

        this.audioContext = audioContext;

        this.GAMMA = 0.985;
        // normal setting
        //this.FFT_MIN_DECIBELS = -65;
        //this.FFT_SMOOTHING_TIME_CONSTANT = 0.9;
        // line in setting
        this.FFT_MIN_DECIBELS = -97;
        this.FFT_SMOOTHING_TIME_CONSTANT = 0.81;

        this.onFrequencyChanged = function(noteInfo){};

        this.reset();
    }

    AudioAnalyser.prototype.reset = function(){
        if(this.frameID)
            cancelRequestAnimationFrame(this.frameID);

        this.buffer = new Float32Array( this.BUFFER_LENGTH );

        this.frameID = null;
        this.analyser = null;
    };

    AudioAnalyser.prototype.connect = function (sourceNode){
        var lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = lowpass.LOWPASS;
        lowpass.frequency = this.LOWPASS_FREQ;
        lowpass.Q = 0.1;

        var highpass = this.audioContext.createBiquadFilter();
        highpass.type = highpass.HIGHPASS;
        highpass.frequency = this.HIGHPASS_FREQ;
        highpass.Q = 0.1;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.FFT_SIZE;
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
    };

    AudioAnalyser.prototype._findBestFreq = function ( sampleRate ) {
        var buffer = this.buffer;
        this.analyser.getFloatFrequencyData(buffer)
        var index, maxValue = -1,
            maxValueIndex = -1,
            bufferLength;

        bufferLength = buffer.length;

        var minIndex = Math.floor(this.HIGHPASS_FREQ / (sampleRate / 2) * bufferLength),
            maxIndex = Math.floor(this.LOWPASS_FREQ / (sampleRate / 2) * bufferLength);
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

        return (maxValueIndex + this.interpolate(y1, y2, y3)) / this.BUFFER_LENGTH * (sampleRate / 2);
    };

    return AudioAnalyser;
})();