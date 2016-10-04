import Rx from 'rx';
import {h} from '@cycle/dom';
import Colors from '~styles/colors';
import Dimens from '~styles/dimens';
import Fonts from '~styles/fonts';
import RxTween from 'rxtween';
import {mergeStyles, textUnselectable} from '~styles/utils';
import Marble from '~components/marble';

const MARBLE_WIDTH = 5; // estimate of a marble width, in percentages
const diagramSidePadding = Dimens.spaceMedium;
const diagramVerticalMargin = Dimens.spaceLarge;
const diagramArrowThickness = '2px';
const diagramArrowSidePadding = Dimens.spaceLarge;
const diagramArrowHeadSize = '8px';
const diagramArrowColor = Colors.black;
const diagramMarbleSize = Dimens.spaceLarge;
const diagramCompletionHeight = '44px';

const diagramStyle = mergeStyles({
  position: 'relative',
  display: 'block',
  width: '100%',
  height: `calc(${diagramMarbleSize} + 2 * ${diagramVerticalMargin})`,
  overflow: 'visible',
  cursor: 'default'},
  textUnselectable
);

const diagramBodyStyle = {
  position: 'absolute',
  left: `calc(${diagramArrowSidePadding} + ${diagramSidePadding}
      + (${diagramMarbleSize} / 2))`,
  right: `calc(${diagramArrowSidePadding} + ${diagramSidePadding}
      + (${diagramMarbleSize} / 2))`,
  top: `calc(${diagramVerticalMargin} + (${diagramMarbleSize} / 2))`,
  height: diagramCompletionHeight,
  marginTop: `calc(0px - (${diagramCompletionHeight} / 2))`
};

function renderMarble$(DOM, marbleData$, isDraggable$) {
  const props = Rx.Observable.combineLatest(marbleData$, isDraggable$, ({data,isDraggable}) => ({
    key: `marble${data.id}`,
    data: data,
    isDraggable,
    style: {size: diagramMarbleSize}
  })).doOnError(e=>console.warn(e))
  return Marble({ DOM, props })
}

function renderMarble(marbleData, isDraggable = false) {
  return h('x-marble.diagramMarble', {
    key: `marble${marbleData.get('id')}`,
    data: marbleData,
    isDraggable,
    style: {size: diagramMarbleSize}
  });
}

function renderCompletion$(DOM, diagramData$, isDraggable$) {
  return diagramData$.combineLatest(isDraggable$, (data, isDraggable) => { 
    let isTall = data.get('notifications').some(marbleData =>
      Math.abs(marbleData.get('time') - data.get('end')) <= MARBLE_WIDTH*0.5
    );
    return h('div', {
      props: {
        key: 'completion',
        time: data.get('endTime'),
        isDraggable,
        isTall,
      },
      style: {
        thickness: diagramArrowThickness,
        color: diagramArrowColor,
        height: diagramCompletionHeight
      }
    })
  }).doOnError(e=>console.warn(e))
}

function renderCompletion(diagramData, isDraggable = false) {
  let endTime = diagramData.get('end');
  let isTall = diagramData.get('notifications').some(marbleData =>
    Math.abs(marbleData.get('time') - diagramData.get('end')) <= MARBLE_WIDTH*0.5
  );
  return h('x-diagram-completion.diagramCompletion', {
    key: 'completion',
    time: endTime,
    isDraggable,
    isTall,
    style: {
      thickness: diagramArrowThickness,
      color: diagramArrowColor,
      height: diagramCompletionHeight
    }
  });
}

function renderDiagramArrow() {
  return h('div.diagramArrow', {style: {
    backgroundColor: diagramArrowColor,
    height: diagramArrowThickness,
    position: 'absolute',
    top: `calc(${diagramVerticalMargin} + (${diagramMarbleSize} / 2))`,
    left: diagramSidePadding,
    right: diagramSidePadding
  }});
}

function renderDiagramArrowHead() {
  return h('div.diagramArrowHead', {style: {
    width: 0,
    height: 0,
    borderTop: `${diagramArrowHeadSize} solid transparent`,
    borderBottom: `${diagramArrowHeadSize} solid transparent`,
    borderLeft: `calc(2 * ${diagramArrowHeadSize}) solid ${diagramArrowColor}`,
    display: 'inline-block',
    right: `calc(${diagramSidePadding} - 1px)`,
    position: 'absolute',
    top: `calc(${diagramVerticalMargin} + (${diagramMarbleSize} / 2)
      - ${diagramArrowHeadSize} + (${diagramArrowThickness} / 2))`
  }});
}

function renderDiagram$(DOM, data$, isInteractive$, props) {
  // TODO optimize here to create a single Marble and maintain it, updating state,
  // just like D3 has Enter, Leave and Change events. Build it using GroupBy?
  const marbles$ = data$
    .map(d => d.get('notifications'))
    .map(ns => 
      // Non-reactive list of marbles for now
      ns.map(n => renderMarble$(DOM, Rx.Observable.of(n), isInteractive$))
    )
  const completions$ = renderCompletion$(DOM, data$, isInteractive$)
  const elements$ = Rx.Observable
    .combineLatest(completions$, marbles$, (c, ms) => { 
      return ms.concat([c]) })

  return elements$.map(es => h('div', { 
      style: diagramStyle,
      attrs: {class: props.class }
    }, [
      renderDiagramArrow(),
      renderDiagramArrowHead(),
      h('div', {style: diagramBodyStyle}, es)
    ]))
}

function renderDiagram(data, isInteractive) {
  let marblesVTree = data.get('notifications')
    .map(notification => renderMarble(notification, isInteractive))
    .toArray(); // from Immutable.List
  let completionVTree = renderCompletion(data, isInteractive);
  return h('div', {style: diagramStyle}, [
    renderDiagramArrow(),
    renderDiagramArrowHead(),
    h('div', {style: diagramBodyStyle}, [completionVTree].concat(marblesVTree))
  ])
}

function sanitizeDiagramItem(x) {
  return Math.max(0, Math.min(100, x));
}

function interpolate(from, to, x) {
  return (from * (1 - x) + to * x);
}

function animateData$(data$) {
  const animConf = {
    from: 0,
    to: 1,
    ease: RxTween.Power3.easeOut,
    duration: 600
  };
  return data$.flatMapLatest(data => {
    if (!data.get('isFirst')) {
      return Rx.Observable.just(data);
    } else {
      let randomizedNotifs = data.get('notifications').map(notif =>
        notif.update('time', time =>
          time - 10 + 20 * Math.random()
        )
      );

      return RxTween(animConf).map(x =>
        data.update('notifications', notifications =>
          notifications.zipWith((n1, n2) =>
            n1.update('time', t1 => {
              let t2 = n2.get('time');
              return interpolate(t2, t1, x);
            }),
            randomizedNotifs
          )
        )
      );
    }
  })
}

function diagramView({ DOM, model, props }) {
  const data$ = animateData$(model.data$).merge(model.newData$)
  const isInteractive$ = model.isInteractive$
  return {
    vtree$: renderDiagram$(DOM, data$, isInteractive$, props)
  }
}

module.exports = diagramView;
