## JavaScript Code Runner

> https://lilykensa.github.io/code/

A minimalist, high-performance web-based environment for executing JavaScript and visualizing complex data structures. Designed with a focus on debugging and presentation, it provides a clean interface for both standalone testing and integrated use.

---

### Core Features

* **Deep Object Inspection**: Specifically engineered to handle complex JavaScript objects, including circular references, Maps, Symbols, and deep nesting without crashing.
* **Minimalist Interface**: A distraction-free UI that prioritizes code real estate and legible output.
* **Function & Class Support**: Visualizes function signatures, named functions, and class instances accurately.

---

### Interactive Slideshow Integration

This runner is optimized for technical presenters. It supports embedding via iframe, making it an ideal companion for interactive slideshows like **reveal.js**.

#### Integration Example

To embed a specific snippet into a reveal.js slide, use the following structure:

```html
<section>
  <h2>Live Code Demo</h2>
  <iframe 
    src="https://lilykensa.github.io/code/..." 
    width="300px" height="200px"
  ></iframe>
</section>

```

#### Why use it for presentations?

* **Live Execution**: Modify code during a talk to answer audience questions in real-time.
* **Embed Parameters**: Use the "Show URL" or "Show Embed" features to generate persistent links that preserve your code state.
* **Low Overhead**: Lightweight enough to run multiple instances across a long slide deck without performance degradation.

---

### Usage

1. **Run**: Executes the current script in the editor.
2. **Show URL**: Generates a shareable link containing the current code.
3. **Show Embed**: Provides the HTML snippet required for iframes.
4. **Dupe Tab**: Quickly clones the current environment for A/B testing logic.

### Tests

#### Basic functions & timings

```js
console.warn("I'm gonna send an alert!");
console.time("Alert");
alert("Hello!");
console.timeEnd("Alert");
```

#### More

WIP...