/**
 * Created by Marek on 3. 5. 2015.
 */


var TunerRenderer = (function(){
    function TunerRenderer(canvas){
        this.STATES = {
            REJECTING: 0,
            ACCEPTING: 1,
            MEASURING: 2
        };

        this.NOTE_MIN_DURATION = 2500; // [ms]
        this.ACCEPTING_DURATION = 1000; // [ms]
        this.NOTE_CENTS_INTERVAL = {LOW: -10, HIGH: 6};

        this.canvas = canvas;
        this.reset();
    }

    TunerRenderer.prototype.reset = function(){
        this.currentNote = null;
        this.currentNoteDuration = 0;
        this.currentNoteProggress = 0;
        this.lastCall = 0;

        this.acceptingDuration = 0;

        this.state = this.STATES.MEASURING;
    };

    TunerRenderer.prototype.update = function(note){
        var currentTime = performance.now();

        if(this.lastCall <= 0)
            this.lastCall = currentTime;
        var delta = (currentTime-this.lastCall);

        if(this.state === this.STATES.ACCEPTING){
            this.acceptingDuration += delta;
            if(this.acceptingDuration > this.ACCEPTING_DURATION){
                this.reset();
                this.state = this.STATES.MEASURING;
            }

            this.lastCall = currentTime;
            return;
        }

        this.currentNote = note;
        this.currentNoteDuration += delta;

        if(this.currentNote && (this.currentNote.name !== note.name || this.currentNote.octave !== note.octave)){
            this.currentNoteDuration -= delta * 6;
        }

        if(note.cents < this.NOTE_CENTS_INTERVAL.LOW || note.cents > this.NOTE_CENTS_INTERVAL.HIGH)
            this.currentNoteDuration -= Math.abs(note.cents) / 4 * delta;

        if(this.currentNoteDuration < 0 || this.currentNoteDuration > this.NOTE_MIN_DURATION){
            var oldDuration = this.currentNoteDuration;

            this.reset();
            this.currentNote = note;

            if(oldDuration > this.NOTE_MIN_DURATION){
                this.state = this.STATES.ACCEPTING;
            }
        }


        this.currentNoteProggress = this.currentNoteDuration / this.NOTE_MIN_DURATION ;

        this.lastCall = currentTime;
    };

    TunerRenderer.prototype.draw = function(){
        var canvas = this.canvas;
        var context = canvas.getContext("2d");

        context.save();
        context.fillStyle = "#ECEFF1";
        context.fillRect ( 0 , 0 , canvas.width, canvas.height );
        context.restore();

        context.save();
            // draw note name and octave
            context.translate(context.canvas.width/2, context.canvas.height/2 + context.canvas.height*0.1);
            context.save();
                var textHeight = canvas.width * 0.07;

                context.font = '100 '+textHeight+'px Roboto';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(this.currentNote ? this.currentNote.name : "", 0, 0);

                context.font = textHeight/5+'px Roboto';
                context.fillText(this.currentNote ? this.currentNote.octave : "", 0, textHeight/2+textHeight/5);
            context.restore();

            // draw circles
            context.save();
                var radius = canvas.width * 0.1;
                var startAngle = -Math.PI / 2;
                var endAngle = 2 * Math.PI * this.currentNoteProggress + startAngle;
                var lineWidth = 3;

                if(this.state === this.STATES.ACCEPTING){
                    var phase = this.acceptingDuration / this.ACCEPTING_DURATION;
                    if(phase < 0.25){
                        phase /= 0.25;
                        phase = phase < 0.5 ? phase : 1-phase
                    }
                    else
                        phase = 0;
                    lineWidth += 10 * phase
                }

                if(this.state === this.STATES.ACCEPTING)
                    endAngle = 2 * Math.PI;
                var counterClockwise = false;

                // border line
                context.beginPath();
                context.arc(0, 0, radius, 0, Math.PI*2, counterClockwise);
                context.lineWidth = 1;
                context.strokeStyle = '#AAAAAA';
                context.stroke();

                // duration line
                context.beginPath();
                context.arc(0, 0, radius, startAngle, endAngle, counterClockwise);
                context.lineWidth = lineWidth;
                context.strokeStyle = this.state === this.STATES.ACCEPTING ? '#558B2F' : 'black';
                context.stroke();
            context.restore();

            // draw cents
            context.save();
                var cents = this.currentNote ? this.currentNote.cents : 0;

                // wolfram:            y = -a^(      -x      +      ln(pi)   /    ln(a))         +       pi where a = 1.1
                //var slope = 1.06;
                //var angle = Math.pow(slope, -Math.abs(cents) + Math.log(Math.PI)/Math.log(slope)) + Math.PI;
                //angle = cents > 0 ? -angle : angle;
                var angle = (cents / 50) * Math.PI;
                context.rotate(angle);
                context.rotate(-Math.PI/2);
                context.translate(radius+15, 0);

                context.beginPath();
                context.arc(0, 0, 5, 0, 2 * Math.PI, false);

                //                               green      red
                context.fillStyle = cents > 0 ? '#64DD17' : '#D50000';
                if(cents < this.NOTE_CENTS_INTERVAL.HIGH && cents > this.NOTE_CENTS_INTERVAL.LOW)
                    context.fillStyle = '#3F51B5';

                context.fill();
            context.restore();
        context.restore();
    };

    return TunerRenderer;
})();