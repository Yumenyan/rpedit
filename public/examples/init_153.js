

importPackage(java.awt);
importPackage(java.awt.geom);
include(Resources.id("mtr:bluevision/display_helper.js"));

include("mtr:bluevision/new_draw_helper.js")
include("mtr:bluevision/for_draw_helper.js")
include('mtr:bluevision/via.js')
include("mtr:bluevision/farelist.js");




let sound = new TickableSound(Resources.id((('mtr:trainhorn'))));
let cluster = GlobalRegister.get('model_panta');
let cluster2 = cluster;
var g;
let slotCfg = {
    "version": 1,
    "texSize": [2820, 1160],
    "slots": [
        {
            "name": "lcd_door_left",
            "texArea": [0, 0, 2100, 500],
            "pos": [
                [[-0.5, 2.1, 0], [-0.5, 1.85, 0], [0.5, 1.85, 0], [0.5, 2.1, 0]]
            ],
            "offsets": [[0.0, 0.314, -7.4]]
        },
        {
            "name": "lcd_door_right",
            "texArea": [0, 0, 2100, 500],
            "pos": [
                [[0.5, 2.1, 0], [0.5, 1.85, 0], [-0.5, 1.85, 0], [-0.5, 2.1, 0]]
            ],
            "offsets": [[0.0, 0.314, 7.4]]
        },
        {
            "name": "money",
            "texArea": [2100, 0, 720, 360],
            "pos": [
                [[-0.978, 2.16, -0.35], [-0.978, 1.78, -0.35], [-0.978, 1.78, -1.0], [-0.978, 2.16, -1.0]]
            ],
            "offsets": [[-0.12, 0, 7.71], [-0.12, 0, -6.41]]
        },
        {
            "name": "money_right",
            "texArea": [2100, 0, 720, 360],
            "pos": [
                [[0.978, 2.16, -1.0], [0.978, 1.78, -1.0], [0.978, 1.78, -0.35], [0.978, 2.16, -0.35]]
            ],
            "offsets": [[0.12, 0, 7.71], [0.12, 0, -6.41]]
        },
        {
            "name": "boundfor1",
            "texArea": [0, 500, 500, 100],
            "pos": [
                [[1.115, 2.26, 0.5], [1.115, 2.04, 0.5], [1.115, 2.04, -0.5], [1.115, 2.26, -0.5]]
            ],
            "offsets": [[0.15, 0.2, 0]]
        },
        {
            "name": "boundfor2",
            "texArea": [0, 500, 500, 100],
            "pos": [
                [[-1.115, 2.26, -0.5], [-1.115, 2.04, -0.5], [-1.115, 2.04, 0.5], [-1.115, 2.26, 0.5]]
            ],
            "offsets": [[-0.15, 0.2, 0]]
        },
        {
            "name": "for3",
            "texArea": [0, 800, 720, 360],
            "pos": [
                [[-1.0, 1.91, -1.9], [-1.0, 1.51, -1.9], [-1.0, 1.51, -1.1], [-1.0, 1.91, -1.1]]
            ],
            "offsets": [[-0.15, 0.13, -3.6]]
        },
        {
            "name": "for4",
            "texArea": [0, 800, 720, 360],
            "pos": [
                [[-1.0, 1.91, -1.1], [-1.0, 1.51, -1.1], [-1.0, 1.51, -1.9], [-1.0, 1.91, -1.9]]
            ],
            "offsets": [[2.15, 0.13, 6.6]]
        },
        {
            "name": "number1",
            "texArea": [0, 600, 500, 100],
            "pos": [
                [[1.015, 0.26, 0.5], [1.015, 0.04, 0.5], [1.015, 0.04, -0.5], [1.015, 0.26, -0.5]]
            ],
            "offsets": [[0.23, 0.2, 0]]
        },
        {
            "name": "number2",
            "texArea": [0, 600, 500, 100],
            "pos": [
                [[-1.015, 0.26, -0.5], [-1.015, 0.04, -0.5], [-1.015, 0.04, 0.5], [-1.015, 0.26, 0.5]]
            ],
            "offsets": [[-0.23, 0.2, 0]]
        }
    ]
}
var dhBase = new DisplayHelper(slotCfg);

function create(ctx, state, train) {
    state.pisRateLimit = new RateLimit(0.1);
    state.dh = dhBase.create();
    state.beforespeed = train.speed() * 72;

    state.speedover = 0;
    state.psdn = -1;
    state.runsoundlimit = new RateLimit(0.5); 
    state.soundair = new TickableSound(Resources.id((('mtr:air4'))));
}


function dispose(ctx, state, train) {
    RemoveDoor(state, train);
    state.dh.close();
}
function render(ctx, state, train) {
    TrainBreakMain(ctx, state, train);
    if (state.pisRateLimit.shouldUpdate()) {
        g = state.dh.graphicsFor("lcd_door_left");
        lcdmain(train, state, true);
        g = state.dh.graphicsFor("boundfor1");
        formain(train);
        g = state.dh.graphicsFor("for3");
        viamain(train);
        g = state.dh.graphicsFor("money");
        listmain(state, train);
        g = state.dh.graphicsFor("number1");
        numbermain(ctx, state, train, false);
        state.dh.upload();
    }
    sound.setData(2, 1, train.lastCarPosition[train.isReversed() ? (train.trainCars() - 1) : 0]);
    if (train.getRailIndex(train.railProgress() + 10, false) > -1) {
        if (train.path().get(train.getRailIndex(train.railProgress() + 10, false)).rail.railType == train.path().get(0).rail.railType.PLATFORM && train.getRailIndex(train.railProgress() + 10, false) != state.zenkai2 && JSON.parse(ClientConfig.get('playhorn').toLowerCase())) {
            if (train.trainTypeId() == 'mtr_custom_train_class_323') {
                SoundHelper.play(boso);
            } else {
                SoundHelper.play(sound);
            }
            state.zenkai2 = train.getRailIndex(train.railProgress() + 10, false);
        }
    }
    
    DoorMain(state, train);
    renderBogie(ctx, state, train, 1, 2);
    for (let i = 0; i < train.trainCars(); i++) {
        if (ClientConfig.get('render_lcd') > MinecraftClient.getCameraDistance(train.lastCarPosition[i])) {
            ctx.drawCarModel(state.dh.model, i, null);
        }
        state.soundair.setData(1, 1.0, train.lastCarPosition[i]);
        if (train.speed() > 0 && state.airplayed == false) {
            if (i % 3 > 1 || i == 0) {
                state.airplayed = true;
            }
            playAir(state, train, 'air4');
        }
        if (train.speed() == 0) {
            state.airplayed = false;
        }
        if (train.trainCars() < 3) {
            if (i == 0) {
                ctx.drawCarModel(cluster, i, null);
            }
        } else if (i !== 0 && i !== train.trainCars() && i % 2 !== 0) {
            ctx.drawCarModel(cluster, i, null);
        }

    }
}
