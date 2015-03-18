/**
 * Created by Marek on 16. 3. 2015.
 */

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
        return 1200 * Math.log( frequency / this.getFreqFromNote( note ))/Math.log(2);
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
