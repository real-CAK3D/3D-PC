import Application from '../Application';
import Resources from '../Utils/Resources';
import ComputerSetup from './Computer';
import MonitorScreen from './MonitorScreen';
import Environment from './Environment';
import Decor from './Decor';
import CoffeeSteam from './CoffeeSteam';
import Cursor from './Cursor';
import Hitboxes from './Hitboxes';
import AudioManager from '../Audio/AudioManager';
import Room from './Stoner/Room';
import Lounge from './Stoner/Lounge';
import WeedPlant from './Stoner/WeedPlant';
import DeskStash from './Stoner/DeskStash';
import Smoke from './Stoner/Smoke';
import Entertainment from './Stoner/Entertainment';
import RoomExtras from './Stoner/RoomExtras';
import Outdoors from './Stoner/Outdoors';
import GameMode from './Stoner/GameMode';
import DeskInputs from './Stoner/DeskInputs';
import GamingChair from './Stoner/GamingChair';
import Toolbox from './Stoner/Toolbox';
import Laptop from './Stoner/Laptop';
import Phone from './Stoner/Phone';
import MakerCorner from './Stoner/MakerCorner';
import ContextMenu from './Stoner/ContextMenu';
import { ROOM } from './Stoner/Room';
import * as THREE from 'three';
export default class World {
    application: Application;
    scene: THREE.Scene;
    resources: Resources;

    // Objects in the scene
    environment: Environment;
    decor: Decor;
    computerSetup: ComputerSetup;
    monitorScreen: MonitorScreen;
    coffeeSteam: CoffeeSteam;
    cursor: Cursor;
    audioManager: AudioManager;
    room: Room;
    lounge: Lounge;
    weedPlant: WeedPlant;
    deskStash: DeskStash;
    smoke: Smoke;
    entertainment: Entertainment;
    roomExtras: RoomExtras;
    outdoors: Outdoors;
    gameMode: GameMode;
    deskInputs: DeskInputs;
    gamingChair: GamingChair;
    toolbox: Toolbox;
    laptop: Laptop;
    phone: Phone;
    makerCorner: MakerCorner;
    contextMenu: ContextMenu;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.resources = this.application.resources;
        // Wait for resources
        this.resources.on('ready', () => {
            // Setup
            this.environment = new Environment();
            this.decor = new Decor();
            this.computerSetup = new ComputerSetup();
            this.monitorScreen = new MonitorScreen();
            this.coffeeSteam = new CoffeeSteam();
            this.audioManager = new AudioManager();
            this.setStonerScene();
            // const hb = new Hitboxes();
            // this.cursor = new Cursor();
        });
    }

    setStonerScene() {
        this.room = new Room();
        this.lounge = new Lounge();
        this.weedPlant = new WeedPlant();
        this.gamingChair = new GamingChair();
        this.entertainment = new Entertainment();
        this.gameMode = new GameMode(this.entertainment);
        this.laptop = new Laptop(this.entertainment);
        this.phone = new Phone(this.lounge.phoneSpot, this.entertainment);
        this.roomExtras = new RoomExtras();
        this.toolbox = new Toolbox();
        this.makerCorner = new MakerCorner();
        this.outdoors = new Outdoors();
        this.deskStash = new DeskStash();
        this.deskInputs = new DeskInputs();
        this.contextMenu = new ContextMenu();

        this.smoke = new Smoke();
        [...this.room.smokePoints, ...this.lounge.smokePoints].forEach((p) => this.smoke.addWisp(p));
        // haze hanging in the room (kept above and behind the monitor so the screen stays clear)
        this.smoke.addHaze(new THREE.Vector3(-8500, 3300, 4500), 10000, 4200, 0.24);
        this.smoke.addHaze(new THREE.Vector3(-1500, 3400, -400), 12000, 3400, 0.2);
        this.smoke.addHaze(new THREE.Vector3(-5000, ROOM.ceiling - 1400, 3500), 18000, 2600, 0.18);
        this.smoke.addHaze(new THREE.Vector3(2500, 2600, 5500), 8000, 3600, 0.14);
    }

    update() {
        if (this.room) this.room.update();
        if (this.weedPlant) this.weedPlant.update();
        if (this.deskStash) this.deskStash.update();
        if (this.entertainment) this.entertainment.update();
        if (this.roomExtras) this.roomExtras.update();
        if (this.outdoors) this.outdoors.update();
        if (this.gameMode) this.gameMode.update();
        if (this.deskInputs) this.deskInputs.update();
        if (this.gamingChair) this.gamingChair.update();
        if (this.toolbox) this.toolbox.update();
        if (this.laptop) this.laptop.update();
        if (this.phone) this.phone.update();
        if (this.makerCorner) this.makerCorner.update();
        if (this.smoke) this.smoke.update();
        if (this.monitorScreen) this.monitorScreen.update();
        if (this.environment) this.environment.update();
        if (this.coffeeSteam) this.coffeeSteam.update();
        if (this.audioManager) this.audioManager.update();
    }
}
