import ContmaticParser from './Contmatic';
import FerreiraDePaulaParser from './FerreiraDePaula';
import DominioParser from './Dominio';
import VerificarParser from './Verificar';

export default {
    Contmatic: new ContmaticParser(),
    FerreiraDePaula: new FerreiraDePaulaParser(),
    Dominio: new DominioParser(),
    Verificar: new VerificarParser(),
};