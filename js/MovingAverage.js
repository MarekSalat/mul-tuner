/**
 * Created by Marek on 16. 3. 2015.
 */

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
