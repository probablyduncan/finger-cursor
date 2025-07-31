import './style.css'
import { lerp } from "@probablyduncan/common/math";
import Vec2 from "@probablyduncan/common/vec2";

document.addEventListener("DOMContentLoaded", initPointer);

const cursors = {
    normal: {
        left: "☜",
        right: "☞",
    },
    active: {
        left: "☚",
        right: "☛",
    },
} as const;

interface PointerState {
    currentPos: Vec2;
    mousePos: Vec2;
    targetPos: Vec2;
    icon: {
        state: keyof typeof cursors;
        dir: keyof (typeof cursors)[keyof typeof cursors];
        update: boolean;
    };
    lastSide: "left" | "right";
    lastUpdate: number;
}

const POINTER_SPEED = 0.1;
const MOVE_THRESHOLD = 2;

let pointer: HTMLElement;
let prevScroll: number;

const state: PointerState = {
    currentPos: Vec2.From(-100),
    targetPos: Vec2.From(-100),
    mousePos: Vec2.From(-100),
    icon: {
        state: "normal",
        dir: "right",
        update: true,
    },
    lastSide: "left",
    lastUpdate: 0,
};

function initPointer() {
    pointer = document.querySelector("[data-pointer]") as HTMLElement;

    if (!pointer) {
        return;
    }

    prevScroll = window.scrollY;

    document.addEventListener("mousemove", moveHandler);
    document.addEventListener("mousedown", downHandler);
    document.addEventListener("mouseup", upHandler);
    document.addEventListener("scroll", scrollHandler);

    document.documentElement.addEventListener("mouseleave", fadeOut);
    document.documentElement.addEventListener("mouseenter", fadeIn);

    requestAnimationFrame(animate);
}

function downHandler(e: MouseEvent) {
    activate();
    updatePos(e);
}

function upHandler(e: MouseEvent) {
    deactivate();
    updatePos(e);
}

function moveHandler(e: MouseEvent) {
    const isMouseButtonDown = e.buttons & (1 << 0);

    if (isMouseButtonDown) {
        activate();
    } else {
        deactivate();
    }

    updatePos(e);
}

function scrollHandler() {
    state.mousePos = state.mousePos.add(Vec2.From(0, window.scrollY - prevScroll));
    updateBoundedPos();
    prevScroll = window.scrollY;
}

function activate() {
    updateIcon("state", "active");
}

function deactivate() {
    updateIcon("state", "normal");
}

function fadeOut() {
    pointer.style.opacity = "0";
}

function fadeIn() {
    pointer.style.opacity = "1";
}

function updatePos({ clientX, clientY }: MouseEvent) {
    state.mousePos = Vec2.From(
        clientX - pointer.clientWidth / 2,
        clientY - pointer.clientHeight / 2 + prevScroll
    );

    updateBoundedPos();
    fadeIn();
}

function updateBoundedPos() {
    state.targetPos = state.mousePos
        // keep bounded pos a certain distance (64px radius) away from cursor
        .subtract(state.mousePos.subtract(state.currentPos).normalized().multiply(64))
        // keep pos away from edges of screen
        .clamp(
            Vec2.From(0, window.scrollY).add(16),
            Vec2.From(window.innerWidth, window.innerHeight + window.scrollY)
                .subtract(Vec2.From(pointer.clientWidth, pointer.clientHeight))
                .subtract(16)
        );
}

function updateIcon<T extends Exclude<keyof typeof state.icon, "update">>(
    key: T,
    value: (typeof state.icon)[T]
): void {
    if (state.icon[key] !== value) {
        state.icon[key] = value as any;
        state.icon.update = true;
    }
}

function animate(timeStamp: number) {
    
    if (state.icon.state === "normal") {
        // don't update current position if active
        state.currentPos = Vec2.From(POINTER_SPEED).lerp(state.currentPos, state.targetPos);
    }

    // represents vector between current position and target position, i.e. direction/distance remaining to target
    const dirToMousePos: Vec2 = state.mousePos.subtract(state.currentPos);

    // update left/right icon
    if (dirToMousePos.x > MOVE_THRESHOLD) {
        updateIcon("dir", "right");
    } else if (dirToMousePos.x < -MOVE_THRESHOLD) {
        updateIcon("dir", "left");
    }

    // update pointer transform
    const rotation = Math.atan2(dirToMousePos.y, dirToMousePos.x) + (state.icon.dir == "left" ? Math.PI : 0);
    pointer.style.setProperty("--rotate", rotation + "rad");

    pointer.style.setProperty("--translate-x", state.currentPos.x + "px");
    pointer.style.setProperty("--translate-y", state.currentPos.y + "px");

    // update pointer html
    if (state.icon.update) {
        state.icon.update = false;
        pointer.innerHTML = cursors[state.icon.state][state.icon.dir];
    }

    // if active, we want to scale up
    if (state.icon.state === "active") {
        const distance = dirToMousePos.divide(Vec2.From(window.innerWidth, window.innerHeight)).magnitude() / Math.SQRT2;
        const scale = lerp(1, 2, Math.pow(distance, 2), true).toString();

        pointer.style.setProperty("--scale", scale);
    } else {
        pointer.style.setProperty("--scale", "1");
    }

    state.lastUpdate = timeStamp;

    requestAnimationFrame(animate);
}