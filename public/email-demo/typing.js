(function () {
  'use strict';

  var examples = [
    'We need transport from Rotterdam to Hamburg. Cargo: 12 pallets. Pickup tomorrow 08:00.',
    'Pickup: Amsterdam → Delivery: Berlin. Cargo: 4 pallets.',
    'Transport request: Eindhoven to Paris, 2 pallets urgent.'
  ];

  var textarea = document.getElementById('email-input');
  if (!textarea) return;

  var typeSpeed = 50;
  var pauseAfterType = 2200;
  var deleteSpeed = 28;
  var pauseAfterDelete = 600;
  var exampleIndex = 0;
  var timeoutIds = [];

  function clearTimeouts() {
    timeoutIds.forEach(clearTimeout);
    timeoutIds = [];
  }

  function schedule(fn, delay) {
    var id = setTimeout(fn, delay);
    timeoutIds.push(id);
  }

  function isRunning() {
    return textarea.value === '';
  }

  function typeChar(text, i, onDone) {
    if (!isRunning()) return;
    if (i >= text.length) {
      schedule(onDone, pauseAfterType);
      return;
    }
    textarea.placeholder = text.slice(0, i + 1);
    schedule(function () {
      typeChar(text, i + 1, onDone);
    }, typeSpeed);
  }

  function deleteChar(text, i, onDone) {
    if (!isRunning()) return;
    if (i <= 0) {
      schedule(onDone, pauseAfterDelete);
      return;
    }
    textarea.placeholder = text.slice(0, i - 1);
    schedule(function () {
      deleteChar(text, i - 1, onDone);
    }, deleteSpeed);
  }

  function runCycle() {
    if (!isRunning()) return;
    var text = examples[exampleIndex];
    exampleIndex = (exampleIndex + 1) % examples.length;
    typeChar(text, 0, function () {
      if (!isRunning()) return;
      deleteChar(text, text.length, function () {
        runCycle();
      });
    });
  }

  function stop() {
    clearTimeouts();
    textarea.placeholder = '';
  }

  function start() {
    if (textarea.value !== '') return;
    clearTimeouts();
    runCycle();
  }

  textarea.addEventListener('input', function () {
    if (textarea.value === '') {
      start();
    } else {
      stop();
    }
  });

  textarea.addEventListener('focus', function () {
    if (textarea.value !== '') {
      stop();
    } else if (timeoutIds.length === 0) {
      start();
    }
  });

  textarea.addEventListener('blur', function () {
    if (textarea.value === '') start();
  });

  start();
})();
