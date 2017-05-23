var Aquaplane = {};

Aquaplane.Preloader = function () {};

Aquaplane.Preloader.prototype = {

    init: function () {

        this.input.maxPointers = 1;

        this.scale.pageAlignHorizontally = true;

    },

    preload: function () {
        
        this.load.path = 'assets/';

        this.load.bitmapFont('fat-and-tiny');
        this.load.bitmapFont('interfont');

        this.load.images([ 'logo', 'husky', 'zomkabob', 'hand', 'zombie', 'town' ]);
        this.load.spritesheet('town', 'town.png', 80, 60);
        this.load.spritesheet('crack', 'crack.png', 16, 6);
        this.load.spritesheet('man', 'man.png', 15, 25);

    },

    create: function () {

        this.state.start('Aquaplane.MainMenu');
       

    }

};


Aquaplane.MainMenu = function () {};

Aquaplane.MainMenu.prototype = {

    create: function () {

        this.add.image(0, 0, 'town');
        var town = game.add.sprite(0, 0, 'town');
        var scroll = man.animations.add('scroll');
        man.animations.play('scroll', 12, true)
        
        var logo = this.add.image( this.world.centerX, 20, 'logo');
        logo.anchor.x = 0.5;

        var start = this.add.bitmapText(this.world.centerX, 460, 'fat-and-tiny', 'CLICK TO PLAY', 64);
        start.anchor.x = 0.5;
        start.smoothed = false;
        start.tint = 0x990000;

        this.input.onDown.addOnce(this.start, this);

    },

    start: function () {

        this.state.start('Aquaplane.Game');

    }

};

Aquaplane.Game = function (game) {

    this.score = 0;
    this.scoreText = null;

    this.lives = 3;
    this.livesText = null;

    this.speed = 420;
    this.lastKey = 0;
    this.ready = false;

    this.layer = null;
    this.itemDist = ['zomkabob', 'zomkabob', 'zomkabob', 'hand', 'hand', 'hand', 'zombie'];

    this.man = null;
    this.husky = null;
    this.rope = null;

    this.timer = null;
    this.itemInterval = { count: 0, min: 500, max: 1500 };

    this.pauseKey = null;
    this.debugKey = null;
    this.showDebug = false;

};

Aquaplane.Game.prototype = {

    init: function () {

        this.score = 0;
        this.lives = 3;
        this.speed = 420;

        this.ready = false;
        this.lastKey = 0;

        this.timer = this.time.create(false);
        this.itemInterval = { count: 0, min: 500, max: 1500 };

        this.physics.startSystem(Phaser.Physics.P2JS);
        this.physics.p2.gravity.y = 0;

        this.showDebug = false;

    },

    create: function () {

        this.add.image(0, 0, 'town');

        this.waterParticle = this.make.bitmapData(2, 2);
        this.waterParticle.rect(0, 0, 2, 2, '#ffffff');
        this.waterParticle.update();

        this.emitter = this.add.emitter(128, 128, 128);
        this.emitter.makeParticles(this.waterParticle);

        this.emitter.gravity = 0;
        this.emitter.setXSpeed(-100, -250);
        this.emitter.setYSpeed(-100, 100);

        this.emitter.setAlpha(1, 0.2, 500);

        this.emitter.flow(500, 20, 2, -1, true);

        this.layer = this.add.group();

        this.man = this.layer.create(0, 0, 'man');
        var man = game.add.sprite(100, 100, 'man');
        var walk = man.animations.add('walk');
        man.animations.play('walk', 12, true)

        this.physics.p2.enable(this.man, false);

        this.man.body.mass = 1;
        this.man.body.damping = 0.5;
        this.man.body.fixedRotation = true;
        this.man.body.collideWorldBounds = false;

        this.husky = this.layer.create(0, 0, 'husky');

        this.physics.p2.enable(this.husky, false);

        this.husky.body.mass = 0.05;
        this.husky.body.damping = 0.5;
        this.husky.body.fixedRotation = true;
        this.husky.body.collideWorldBounds = false;

        this.manBounds = new Phaser.Rectangle(0, 0, 60, 10);
        this.huskyBounds = new Phaser.Rectangle(0, 0, 30, 8);

        var rev = new p2.RevoluteConstraint(this.man.body.data, this.husky.body.data, {
                localPivotA: [9, 0],
                localPivotB: [2, 0],
                collideConnected: false
            });

        this.physics.p2.world.addConstraint(rev);

        rev.setLimits(this.math.degToRad(-40), this.math.degToRad(40));

        rev.setStiffness(2.0);

        //  Let's create some cracks (harmless eye candy)
        //  
        //  Divide screen vertically into 520px / 8 layers = 65px per layer
        //  Place 8 cracks per layer (8*8 total)

        var area = new Phaser.Rectangle(0, 80, this.game.width, 65);

        for (var i = 1; i <= 8; i++)
        {
            for (var w = 0; w < 8; w++)
            {
                var crack = this.layer.create(area.randomX, area.randomY, 'crack', this.rnd.between(0, 2));
                'crack'.anchor.y = -1.5;
                this.physics.arcade.enable(crack);
                crack.body.velocity.x = -120 + (i * -30);
            }

            area.y += 65;
        }
// var man = this.layer.create(area.randomX, area.randomY, 'man', this.rnd.between(0, 2));
        this.line = new Phaser.Line(this.man.x - 28, this.man.y, this.husky.x + 6, this.husky.y - 1);

        //  The rope that attaches the husky to the man
        this.rope = this.add.graphics(0, 0);

        this.scoreText = this.add.bitmapText(16, 0, 'fat-and-tiny', 'SCORE: 0', 32);
        this.scoreText.smoothed = false;

        this.livesText = this.add.bitmapText(680, 0, 'fat-and-tiny', 'LIVES: ' + this.lives, 32);
        this.livesText.smoothed = false;

        this.cursors = this.input.keyboard.createCursorKeys();

        //  Press P to pause and resume the game
        this.pauseKey = this.input.keyboard.addKey(Phaser.Keyboard.P);
        this.pauseKey.onDown.add(this.togglePause, this);

        //  Press D to toggle the debug display
        this.debugKey = this.input.keyboard.addKey(Phaser.Keyboard.D);
        this.debugKey.onDown.add(this.toggleDebug, this);

        this.bringManOn();

    },

    togglePause: function () {

        this.game.paused = (this.game.paused) ? false : true;

    },

    toggleDebug: function () {

        this.showDebug = (this.showDebug) ? false : true;

    },

    bringManOn: function () {

        this.ready = false;

        this.man.body.x = -64;
        this.man.body.y = 300;

        this.husky.visible = true;
        this.husky.body.x = -264;
        this.husky.body.y = 300;

        this.husky.body.velocity.x = 300;

    },

    manReady: function () {

        this.ready = true;
        
        this.man.body.setZeroVelocity();

        this.timer.add(this.itemInterval.max, this.releaseItem, this);
        this.timer.start();

    },

    releaseItem: function (x, y) {

        if (x === undefined) { x = 800; }
        if (y === undefined) { y = this.rnd.between(80, 487); }

        var frame = this.rnd.pick(this.itemDist);

        var item = this.layer.getFirstDead(true, x, y, frame);
        
        this.physics.arcade.enable(item);

        if (frame === 'zombie')
        {
            item.body.setSize(32, 14, 0, 16);
        }
        else
        {
            item.body.setSize(16, 8, 0, 24);
        }

        var i = this.math.snapToFloor(y, 65) / 65;

        item.body.velocity.x = -120 + (i * -30);

        this.itemInterval.count++;

        //  Every 10 new items we'll speed things up a bit
        if (this.itemInterval.min > 100 && this.itemInterval.count % 10 === 0)
        {
            this.itemInterval.min -= 10;
            this.itemInterval.max -= 10;
        }

        //  Is the player idle? Then release another item directly towards them
        if ((this.time.time - this.lastKey) > 200)
        {
            this.lastKey = this.time.time;
            this.releaseItem(800, this.husky.y - 16);
        }
        else
        {
            this.timer.add(this.rnd.between(this.itemInterval.min, this.itemInterval.max), this.releaseItem, this);
        }

    },

    update: function () {

        this.layer.sort('y', Phaser.Group.SORT_ASCENDING);

        if (this.ready)
        {
            this.updateMan();

            //  Score based on their position on the screen
            this.score += (this.math.snapToFloor(this.husky.y, 65) / 65);
            this.scoreText.text = "SCORE: " + this.score;
        }
        else
        {
            if (this.husky.visible)
            {
                if (this.man.x >= 250)
                {
                    this.manReady();
                }
            }
            else
            {
                if (this.man.x >= 832)
                {
                    this.bringManOn();
                }
            }
        }

        this.manBounds.centerOn(this.man.x + 4, this.man.y + 8);
        this.huskyBounds.centerOn(this.husky.x + 2, this.husky.y + 10);

        this.emitter.emitX = this.man.x - 16;
        this.emitter.emitY = this.man.y + 10;

        //  Let's sort and collide
        this.layer.forEachAlive(this.checkItem, this);

    },

    updateMan: function () {

        if (this.man.x < 200)
        {
            this.man.body.setZeroForce();
            this.man.body.x = 200;
        }
        else if (this.man.x > 750)
        {
            this.man.body.setZeroForce();
            this.man.body.x = 750;
        }

        if (this.man.y < 100)
        {
            this.man.body.setZeroForce();
            this.man.body.y = 100;
        }
        else if (this.man.y > 550)
        {
            this.man.body.setZeroForce();
            this.man.body.y = 550;
        }

        if (this.cursors.left.isDown)
        {
            this.man.body.force.x = -this.speed;
            this.lastKey = this.time.time;
        }
        else if (this.cursors.right.isDown)
        {
            this.man.body.force.x = this.speed;
            this.lastKey = this.time.time;
        }

        if (this.cursors.up.isDown)
        {
            this.man.body.force.y = -this.speed;
            this.lastKey = this.time.time;
        }
        else if (this.cursors.down.isDown)
        {
            this.man.body.force.y = this.speed;
            this.lastKey = this.time.time;
        }

    },

    checkItem: function (item) {

        if (item === this.man || item === this.husky)
        {
            return;
        }

        if (item.x < -32)
        {
            if (item.key === 'crack')
            {
                item.x = this.rnd.between(800, 864);
            }
            else
            {
                item.kill();
            }
        }
        else
        {
            //   Check for collision
            if (this.ready && item.key !== 'crack' && this.huskyBounds.intersects(item.body))
            {
                this.loseLife();
            }
        }

    },

    loseLife: function () {

        if (this.lives === 0)
        {
            this.gameOver();
        }
        else
        {
            this.lives--;

            this.livesText.text = "LIVES: " + this.lives;

            this.ready = false;

            //  Kill the dog!
            this.husky.visible = false;

            //  Hide the rope
            this.rope.clear();

            //  Speed the man away
            this.man.body.setZeroVelocity();
            this.man.body.velocity.x = 600;

            this.itemInterval.min += 200;
            this.itemInterval.max += 200;
        }

    },

    gameOver: function () {

        this.state.start('Aquaplane.MainMenu');

    },

    preRender: function () {

        this.line.setTo(this.man.x - 28, this.man.y, this.husky.x + 6, this.husky.y - 1);

        if (this.husky.visible)
        {
            this.rope.clear();
            this.rope.lineStyle(1, 0xffffff, 1);
            this.rope.moveTo(this.line.start.x, this.line.start.y);
            this.rope.lineTo(this.line.end.x, this.line.end.y);
            this.rope.endFill();
        }

    },

    render: function () {

        if (this.showDebug)
        {
            this.game.debug.geom(this.manBounds);
            this.game.debug.geom(this.huskyBounds);
            this.layer.forEachAlive(this.renderBody, this);
            this.game.debug.geom(this.husky.position, 'rgba(255,255,0,1)');
        }

    },

    renderBody: function (sprite) {

        if (sprite === this.man || sprite === this.husky || sprite.key === 'crack')
        {
            return;
        }

        this.game.debug.body(sprite);

    }

};

var game = new Phaser.Game(800, 600, Phaser.AUTO, 'game');

game.state.add('Aquaplane.Preloader', Aquaplane.Preloader);
game.state.add('Aquaplane.MainMenu', Aquaplane.MainMenu);
game.state.add('Aquaplane.Game', Aquaplane.Game);

game.state.start('Aquaplane.Preloader');
