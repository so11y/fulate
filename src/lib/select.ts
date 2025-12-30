//@ts-nocheck
import { CENTER } from "../util/constants";
import { makeBoundingBoxFromPoints, Point } from "../util/point";
import { degreesToRadians, radiansToDegrees } from "../util/radiansDegreesConversion";
import { Layer } from "./layer";

const size = 8; // 控制点尺寸

interface Control {
    type: string;
    actionName: string;
    cursor: string;
    x: number;
    y: number;
    offsetY?: number;
    offsetX?: number;
}

const controls: Array<Control> = [
    {
        type: "tl",
        actionName: "scale",
        cursor: "crosshair",
        x: 0,
        y: 0,
    },
    {
        type: "tr",
        actionName: "scale",
        cursor: "crosshair",
        x: 1,
        y: 0
    },
    {
        type: "br",
        actionName: "scale",
        cursor: "crosshair",
        x: 1,
        y: 1
    },
    {
        type: "bl",
        actionName: "scale",
        cursor: "crosshair",
        x: 0,
        y: 1
    },
    // {
    //     type: "mb",
    //     actionName: "scale",
    //     cursor: "crosshair",
    //     x: 0,
    //     y: 0.5
    // },
    // {
    //     type: "ml",
    //     actionName: "scale",
    //     cursor: "crosshair",
    //     x: -0.5,
    //     y: 0
    // },
    // {
    //     type: "mr",
    //     actionName: "scale",
    //     cursor: "crosshair",
    //     x: 0.5,
    //     y: 0
    // },
    // {
    //     type: "mt",
    //     actionName: "scale",
    //     cursor: "crosshair",
    //     x: 0,
    //     y: -0.5
    // },
    {
        type: "mtr",
        actionName: "rotate",
        cursor: "crosshair",
        x: 0.5,
        y: 0,
        offsetY: -40,
        rotateObjectWithSnapping(eventData, { target, ex, ey, theta, originX, originY }, x, y) {
            const pivotPoint = target.translateToGivenOrigin(target.getRelativeCenterPoint(), originX, originY);
            // if (isLocked(target, "lockRotation")) {
            //     return false;
            // }
            const lastAngle = Math.atan2(ey - pivotPoint.y, ex - pivotPoint.x)
                , curAngle = Math.atan2(y - pivotPoint.y, x - pivotPoint.x);
            let angle = radiansToDegrees(curAngle - lastAngle + theta);
            if (target.snapAngle && target.snapAngle > 0) {
                const snapAngle = target.snapAngle
                    , snapThreshold = target.snapThreshold || snapAngle
                    , rightAngleLocked = Math.ceil(angle / snapAngle) * snapAngle
                    , leftAngleLocked = Math.floor(angle / snapAngle) * snapAngle;
                if (Math.abs(angle - leftAngleLocked) < snapThreshold) {
                    angle = leftAngleLocked;
                } else if (Math.abs(angle - rightAngleLocked) < snapThreshold) {
                    angle = rightAngleLocked;
                }
            }
            if (angle < 0) {
                angle = 360 + angle;
            }
            angle %= 360;
            // const hasRotated = target.angle !== angle;
            return angle;
        },
        callback(el: Select, point: Point, theta: number, event: MouseEvent) {
            // const centerPoint = el.getRelativeCenterPoint()
            //  const constraint = el.translateToGivenOrigin(centerPoint, el.originX, el.originY, CENTER, CENTER,)
            // const constraint = el.getWorldCenterPoint()
            const constraint = el.getWorldCenterPoint()


            const angle = this.rotateObjectWithSnapping(event, {
                target: el,
                ex: point.x,
                ey: point.y,
                originX: el.originX,
                originY: el.originY,
                theta
            }, event.detail.x, event.detail.y)

            const angleDelta = angle - theta;
            el.selectEls.forEach((child, index) => {
                child.angle = angleDelta

                const childCenterWorld = child.getWorldCenterPoint();

                const offsetX = childCenterWorld.x - constraint.x;
                const offsetY = childCenterWorld.y - constraint.y;


                // 旋转这个偏移向量
                const rad = angleDelta * Math.PI / 180; 
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const newOffsetX = offsetX * cos - offsetY * sin;
                const newOffsetY = offsetX * sin + offsetY * cos;

                // 计算 child 新的世界中心点
                const newChildCenterWorld = new Point(
                    constraint.x + newOffsetX,
                    constraint.y + newOffsetY
                );

                console.log(newChildCenterWorld, index, constraint);


                child.setPositionByOrigin(
                    newChildCenterWorld,
                ).layer.render()
            })

            el.setOptions({
                angle
            }).render()

        }
    },
] as const;

export class Select extends Layer {
    constructor() {
        super({
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            width: 0,
            height: 0,
            originX: "center",
            originY: "center"
        });
        this.selectEls = []
        this.ControlSize = 8
        this.eventManage.hasUserEvent = true;
    }

    mounted() {

        const handleSelect = (e) => {
            this.selectEls = []
            this.clear();
            this.setOptions({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                angle: 0
            }).render();
            const directEl = this.root.children?.filter((v) => v !== this);
            const startPoint = new Point(e.detail.x, e.detail.y);
            const pointermove = (e: PointerEvent) => {
                const endPoint = new Point(e.detail.x, e.detail.y);
                this.setOptions({
                    left: Math.min(startPoint.x, endPoint.x),
                    top: Math.min(startPoint.y, endPoint.y),
                    width: Math.abs(endPoint.x - startPoint.x),
                    height: Math.abs(endPoint.y - startPoint.y)
                }).render();
            };
            this.root.addEventListener("pointermove", pointermove);
            this.root.addEventListener(
                "pointerup",
                () => {
                    this.root.removeEventListener("pointermove", pointermove)
                    const [{ point: tl }, , { point: br }] = this.coords
                    const objects = directEl?.filter(object => {
                        if (!object.selectable && !object.visible && (object.intersectsWithRect(tl, br) || object.isContainedWithinRect(tl, br) || object.containsPoint(tl) || object.containsPoint(br))) {
                            return object
                        }
                    })
                    this.selectEls = objects
                    const rect = makeBoundingBoxFromPoints(objects?.map(v => v.coords).flat(1))
                    this.setOptions(rect).render();
                },
                {
                    once: true
                }
            );
        }

        const handleControl = (e) => {
            const { control, point } = this.currentControl
            console.log(this.coords, '---');
            const theta = degreesToRadians(this.angle ?? 0)
            const pointermove = (e: PointerEvent) => {
                const endPoint = new Point(e.detail.x, e.detail.y);
                control.callback(this, point, theta, e,)
            };
            this.root.addEventListener("pointermove", pointermove);
            this.root.addEventListener(
                "pointerup",
                () => this.root.removeEventListener("pointermove", pointermove),
                {
                    once: true
                }
            );
        }

        const pointerdown = (e: PointerEvent) => {
            if (!this.currentControl) {
                handleSelect(e);
            } else {
                handleControl(e)
            }

        };
        this.root.addEventListener("pointerdown", pointerdown);
        super.mounted();
    }

    render() {
        this.clear();
        const ctx = this.ctx;
        const coords = this.getCoords()
        if (!this.width || !this.height) {
            return
        }
        ctx.save();
        ctx.beginPath();
        ctx.setTransform(this.ownMatrixCache);
        if (this.backgroundColor) {
            ctx.fillStyle = this.backgroundColor;
        }
        ctx.roundRect(0, 0, this.width!, this.height!, this.radius ?? 0);
        if (this.backgroundColor) {
            ctx.fill();
        }
        ctx.restore();
        coords.forEach(({ point, control },) => this.drawControlPoint(ctx, point, control));
    }

    drawControlPoint(ctx: CanvasRenderingContext2D, point: Point, control: typeof controls[0]) {
        ctx.save();
        if (control.type === "mtr") {
            // 绘制圆形（边中点、旋转点）
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.ControlSize - 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4757';
            ctx.fill();
        } else {
            ctx.beginPath();
            this.drawRoundedRect(
                ctx,
                point.x - this.ControlSize / 2,
                point.y - this.ControlSize / 2,
                this.ControlSize,
                this.ControlSize,
            );
            ctx.fillStyle = '#0078ff';
            ctx.fill();
        }
        ctx.restore();
    }

    drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius = 2) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    hasPointHint(x: number, y: number): boolean {
        const coords = this.coords;
        this.currentControl = null;
        this.cursor = 'default'
        for (let i = 0; i < coords.length; i++) {
            const { point, control } = coords[i];

            const distance = Math.sqrt(
                Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
            );

            if (distance <= this.ControlSize) {
                console.log(control);
                this.cursor = control.cursor
                this.currentControl = coords[i]
                return true;
            }
        }
        if (this.width === 0 || this.height === 0) {
            return false
        }
        return super.hasPointHint(x, y)
    }

    clear() {
        this.ctx.clearRect(0, 0, this.root.width, this.root.height);
    }

    getCoords() {
        const finalMatrix = this.ownMatrixCache;
        const dim = this._getTransformedDimensions({
            width: this.width ?? 0,
            height: this.height ?? 0
        });
        this.coords = controls.map((control, index) => {
            const x = control.x * dim.x + (control.offsetX ?? 0);
            const y = control.y * dim.y + (control.offsetY ?? 0);
            return {
                control,
                point: new Point(finalMatrix?.transformPoint(new Point(x, y)))
            };
        });
        return this.coords
    }
}
