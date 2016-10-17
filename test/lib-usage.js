import { DiagramComponent } from '../dist/js/lib'
import { mockDOMSource } from '@cycle/dom'

if(typeof document == 'undefined') {
  var document = {};
}

const domSource = mockDOMSource(RxAdapter, {
  '.foo': {
    'click': Rx.Observable.of({target: {}}),
    'mouseover': Rx.Observable.of({target: {}}),
  },
  '.bar': {
    'scroll': Rx.Observable.of({target: {}}),
    elements: Rx.Observable.of({tagName: 'div'}),
  }
});

const component = DiagramComponent({
  DOM: domSource,
  props: {
    class: "diagram",
    data: Observable.of(data),
    interactive: Observable.of(true),
    key: `diagram0`,
  }
})

component.DOM.subscribe(console.log)
