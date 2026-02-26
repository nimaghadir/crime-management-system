import { Component } from "react";

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: String(error?.message || "Unknown application error."),
    };
  }

  componentDidCatch(error, info) {
    console.error("[ui] Unhandled error boundary", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="grid min-h-screen place-items-center bg-noir px-4 text-paper">
        <section className="card w-full max-w-2xl p-6">
          <h1 className="font-display text-3xl uppercase text-brass">Something Went Wrong</h1>
          <p className="mt-2 text-zinc-300">
            An unexpected UI error happened. You can refresh the page or go back to home.
          </p>
          <p className="mt-3 rounded border border-zinc-700 bg-zinc-900/60 p-3 text-sm text-zinc-200">
            {this.state.errorMessage}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button className="btn-secondary" onClick={() => window.location.assign("/")}>
              Go to Landing
            </button>
          </div>
        </section>
      </div>
    );
  }
}
