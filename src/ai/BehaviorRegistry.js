import { Selector } from './nodes/Selector.js';
import { Sequence } from './nodes/Sequence.js';
import { Patrol } from './tasks/Patrol.js';
import { FindTarget } from './tasks/FindTarget.js';
import { IsTargetInRange } from './tasks/IsTargetInRange.js';
import { Chase } from './tasks/Chase.js';
import { Attack } from './tasks/Attack.js';

export class BehaviorRegistry {
  constructor() { this._trees = new Map(); this._buildAll(); }
  get(typeId) { return this._trees.get(typeId) ?? this._trees.get('default'); }
  _buildAll() {
    const meleeTree = new Selector([new Sequence([new FindTarget(), new Selector([new Sequence([new IsTargetInRange(), new Attack()]), new Chase()])]), new Patrol()]);
    this._trees.set('default', meleeTree);
    this._trees.set('swordsman', meleeTree);
    this._trees.set('spearman', meleeTree);
    this._trees.set('giant', meleeTree);
    const rangedTree = new Selector([new Sequence([new FindTarget(), new Selector([new Sequence([new IsTargetInRange(), new Attack()]), new Chase()])]), new Patrol(15, 3)]);
    this._trees.set('archer', rangedTree);
    this._trees.set('musketeer', rangedTree);
    this._trees.set('knight', new Selector([new Sequence([new FindTarget(), new Selector([new Sequence([new IsTargetInRange(), new Attack()]), new Chase()])]), new Patrol(30, 1)]));
    this._trees.set('horseman', new Selector([new Sequence([new FindTarget(), new Selector([new Sequence([new IsTargetInRange(), new Attack()]), new Chase()])]), new Patrol(40, 0.5)]));
    this._trees.set('catapult', new Selector([new Sequence([new FindTarget(), new Attack()]), new Patrol(5, 1)]));
  }
}
