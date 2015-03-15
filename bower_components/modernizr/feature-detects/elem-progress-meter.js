//By Stefan Wallin

//tests for progressbar-support. All browsers that don'reset support progressbar returns undefined =)
Modernizr.addTest("progressbar",function(){
    return document.createElement('progress').max !== undefined;
});

//tests for meter-support. All browsers that don'reset support meters returns undefined =)
Modernizr.addTest("meter",function(){
    return document.createElement('meter').max !== undefined;
});
