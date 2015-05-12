/**
 * Created by Marek on 3. 5. 2015.
 */

var AudioAnalyserHistRenderer = (function(){
    function AudioAnalyserHistRenderer(canvas, audioAnalyser){
        this.canvas = canvas;
        this.audioAnalyser = audioAnalyser;
    }

    AudioAnalyserHistRenderer.prototype.draw = function(){
        var canvas = this.canvas;
        var context = canvas.getContext("2d");

        context.save();
            // purple 300
            context.fillStyle = "#ECEFF1";
            context.fillRect ( 0 , 0 , canvas.width, canvas.height );
        context.restore();

        if (!this.audioAnalyser.analyser)
            return;

        context.save();
            var HEIGHT = canvas.height;
            var WIDTH = canvas.width;
            var bins = this.audioAnalyser.analyser.frequencyBinCount * 0.04;
            var freqDomain = new Uint8Array(this.audioAnalyser.analyser.frequencyBinCount);
            this.audioAnalyser.analyser.getByteFrequencyData(freqDomain);
            var i = Math.floor(this.audioAnalyser.HIGHPASS_FREQ / (this.audioAnalyser.audioContext.sampleRate / 2) * this.audioAnalyser.analyser.frequencyBinCount);

            var barWidth = WIDTH/bins;
            for (; i < bins; i++) {
                var gamma = Math.pow(this.audioAnalyser.GAMMA, i);
                var value = freqDomain[i] * gamma;
                var percent = value / 256;
                var height = HEIGHT * percent;
                var offset = HEIGHT - height - 1;

                var hue = i/bins * 360;
                context.fillStyle = '#E91E63'; //'hsl(' + hue + ', 100%, 50%)';
                context.fillRect(i * barWidth, offset, barWidth, height);
            }
        context.restore();
    };

    return AudioAnalyserHistRenderer;
})();