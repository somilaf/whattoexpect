import { IUredjaj, ISklop } from '../oprema';
import { IPrijavakvara } from './prijavakvara';

export const TIPPROBLEMA = [
    'M','P','E','EL','S','G','AU', 'IT'
];

export interface IIntervencija {
    readonly idIntervencije?: number;
    datumIntervencije: Date;
    opisIntervencije: string;
    idAkcije: number;
    vrstaProblema: string;
    delovi: string;
    napomena: string;
    prijavaKvara?: any;
    vremeZastoja: number;
    zaposleni?: string;
    uredjaj?: IUredjaj;
    sklop?: ISklop;
    tiket?: IPrijavakvara
}
