import { Node } from "../runtime/nodes/Node";
import { EventTranslator, RegisterEventDispatcher, VueEventsOfType, VugelEvent } from "./index";
import { getCommonAncestor, getCurrentContext } from "./utils";
import { VugelStage } from "../wrapper";
import { ElementCoordinatesInfo } from "tree2d/lib";

export interface VugelMouseEvent extends VugelEvent<MouseEvent | TouchEvent> {
    readonly canvasOffsetX: number;
    readonly canvasOffsetY: number;
    readonly elementOffsetX: number;
    readonly elementOffsetY: number;
    readonly currentElement: ElementCoordinatesInfo<Node> | undefined;
}

export type MouseEventState = {
    activeNode?: Node;
};

const translateEvent: EventTranslator<MouseEvent, VugelMouseEvent> = (stage, e) => {
    const { currentElement, canvasOffsetX, canvasOffsetY } = getCurrentContext(e, stage);
    const currentNode = currentElement?.element.data;

    return {
        cancelBubble: false,

        // Event
        type: e.type as SupportedMouseEvents,
        currentTarget: currentNode ?? null,
        target: currentNode ?? null,

        // MouseEvent
        canvasOffsetX: canvasOffsetX,
        canvasOffsetY: canvasOffsetY,
        elementOffsetX: currentElement?.offsetX ?? 0,
        elementOffsetY: currentElement?.offsetY ?? 0,
        currentElement: currentElement,

        originalEvent: e,
    };
};

// https://www.w3.org/TR/uievents/#events-mouse-types
const dispatchMouseEvent = (stage: VugelStage, eventState: MouseEventState) => {
    return (e: MouseEvent) => {
        const translatedEvent = translateEvent(stage, e);
        dispatchVugelMouseEvent(translatedEvent, eventState);
    };
};

export const dispatchVugelMouseEvent = (translatedEvent: VugelMouseEvent, eventState: MouseEventState) => {
    const prevNode = eventState.activeNode;
    const currentNode = translatedEvent.currentElement?.element.data;

    switch (translatedEvent.type as SupportedMouseEvents) {
        case "auxclick":
        case "click":
        case "contextmenu":
        case "dblclick":
        case "mousedown":
        case "mouseup": {
            currentNode?.dispatchBubbledEvent(translatedEvent);
            break;
        }
        case "mouseenter": {
            eventState.activeNode = undefined;

            if (currentNode) {
                eventState.activeNode = currentNode;

                // Mouseleave and mouseenter, though not bubbeling events, need to be called recursively until the common ancestor.
                currentNode.dispatchBubbledEvent(
                    {
                        ...translatedEvent,
                        currentTarget: prevNode ?? null,
                    },
                    getCommonAncestor(prevNode, currentNode),
                    false,
                );
            }

            break;
        }
        case "mouseover": {
            eventState.activeNode = undefined;

            if (currentNode) {
                eventState.activeNode = currentNode;

                currentNode?.dispatchBubbledEvent({
                    ...translatedEvent
                });
            }

            break;
        }
        case "mouseleave": {
            prevNode?.dispatchBubbledEvent(
                {
                    ...translatedEvent,
                    target: prevNode,
                },
                getCommonAncestor(prevNode, currentNode),
                false,
            );
            break;
        }
        case "mouseout": {
            prevNode?.dispatchBubbledEvent({
                ...translatedEvent,
                target: prevNode,
            });

            break;
        }
        case "mousemove": {
            if (currentNode) {
                const commonAncestor = getCommonAncestor(prevNode, currentNode);
                if (prevNode != currentNode) {
                    prevNode?.dispatchBubbledEvent({
                        ...translatedEvent,
                        type: "mouseout",
                        target: prevNode,
                    });

                    prevNode?.dispatchBubbledEvent(
                        {
                            ...translatedEvent,
                            type: "mouseleave",
                            target: prevNode,
                        },
                        commonAncestor,
                        false,
                    );

                    currentNode.dispatchBubbledEvent({
                        ...translatedEvent,
                        type: "mouseover",
                    });

                    currentNode.dispatchBubbledEvent(
                        {
                            ...translatedEvent,
                            type: "mouseenter",
                        },
                        commonAncestor,
                        false,
                    );
                }

                // Mousemove
                currentNode.dispatchBubbledEvent(translatedEvent);

                eventState.activeNode = currentNode;
            }
        }
    }
};

export type SupportedMouseEvents = keyof Pick<
    GlobalEventHandlersEventMap,
    | "auxclick"
    | "click"
    | "contextmenu"
    | "dblclick"
    | "mousedown"
    | "mouseenter"
    | "mouseleave"
    | "mousemove"
    | "mouseout"
    | "mouseover"
    | "mouseup"
>;

export const mouseEventTranslator: {
    [x in SupportedMouseEvents]: VueEventsOfType<MouseEvent>;
} = {
    auxclick: "onAuxclick",
    click: "onClick",
    contextmenu: "onContextmenu",
    dblclick: "onDblclick",
    mousedown: "onMousedown",
    mouseenter: "onMouseenter",
    mouseleave: "onMouseleave",
    mousemove: "onMousemove",
    mouseout: "onMouseout",
    mouseover: "onMouseover",
    mouseup: "onMouseup",
} as const;

export const setupMouseEvents: RegisterEventDispatcher = (canvasElement, stage) => {
    const eventState: MouseEventState = {};

    for (const key in mouseEventTranslator) {
        canvasElement.addEventListener(key, dispatchMouseEvent(stage, eventState) as EventListener);
    }
};
