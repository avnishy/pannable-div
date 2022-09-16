export interface Card {
    x: number;
    y: number;
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