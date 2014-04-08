var objects = [
    {
        type: 'bullet',
        x: 10,
        y: 10,
        direction: 0
    },
    {
        type: 'bullet',
        x: 20,
        y: 20,
        direction: 0
    },
    {
        type: 'ripples',
        x: 80,
        y: 40,
        direction: 0
    },
    {
        type: 'canon',
        x: 60,
        y: 100,
        direction: 40
    }
];

var a= 0, b= 0, intervalId;

var templates = {
    bullet: function(context, object){
        context.moveTo(object.x+2, object.y);
        context.arc(object.x, object.y, 2, 0, Math.PI*2, true);
    },
    ripples: function(context, object){
        context.moveTo(object.x+5, object.y);
        context.arc(object.x, object.y, 5, 0, Math.PI*2, true);
        context.moveTo(object.x+12, object.y);
        context.arc(object.x, object.y, 12, 0, Math.PI*2, true);
    },
    canon: function(context, object){
        context.moveTo(object.x+15, object.y);
        context.arc(object.x, object.y, 15, 0, Math.PI*2, true);
        context.moveTo(object.x, object.y);
        a = Math.sin(object.direction * Math.PI / 180)*20 + object.x;
        b = Math.cos(object.direction * Math.PI / 180)*20 + object.y;
        context.lineTo(a, b);
    }
};

function draw(objects, canvas) {
    if (canvas.getContext){
        var ctx = canvas.getContext('2d');

        ctx.beginPath();
        objects.forEach(function(obj){
            templates[obj.type](ctx, obj);
        });
        ctx.stroke();
    }
}

$( document ).ready(function() {
    var canvas = document.getElementById('tutorial');
    intervalId = setInterval(function(){
        canvas.width = canvas.width;
        objects.forEach(function(obj){
            obj.x = obj.x + 5;
        });
        draw(objects, canvas);
    }, 100);

});
