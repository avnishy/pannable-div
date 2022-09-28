export interface Card {
    x: number;
    ox: number;
    y: number;
    oy: number;
    width: number;
    height: number;
    color: string;
    image: string;
    type: string;
    id: string;
    cards?: Card[];
    selected?: boolean;
    z: number;
}