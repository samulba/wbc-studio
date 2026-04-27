'use client'

/**
 * ErrorBoundary fuer den Aufgaben-Bereich.
 * Faengt Render-Errors ab und zeigt eine Recovery-Card statt
 * White-Screen, mit 'Neu laden'-Button und 'Bug melden'-Hinweis.
 *
 * Reset automatisch wenn children sich aendern (z.B. nach navigation).
 */

import React from 'react'
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react'

interface Props {
  children: React.ReactNode
  /** Optionaler Name fuer Konsolen-Logs */
  name?: string
}

interface State {
  hasError: boolean
  errorMessage?: string
}

export default class AufgabenErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[AufgabenErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, errorMessage: undefined })
    }
  }

  reset = () => this.setState({ hasError: false, errorMessage: undefined })

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm max-w-2xl mx-auto my-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">Hier ist etwas schiefgelaufen</h3>
              <p className="text-xs text-gray-500 mt-1">
                Die Ansicht konnte nicht geladen werden. Versuch es nochmal — falls das Problem bleibt,
                schick uns ein Feedback (Button unten rechts) damit wir den Fehler reproduzieren können.
              </p>
              {this.state.errorMessage && (
                <details className="mt-2 text-[11px] text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600">Technische Details</summary>
                  <code className="block mt-1 break-all">{this.state.errorMessage}</code>
                </details>
              )}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => {
                    this.reset()
                    window.location.reload()
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-wellbeing-green text-white rounded-lg hover:bg-wellbeing-green-dark"
                >
                  <RefreshCw size={12} /> Neu laden
                </button>
                <button
                  onClick={this.reset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  Erneut versuchen
                </button>
                <span className="text-[11px] text-gray-400 inline-flex items-center gap-1 ml-auto">
                  <MessageSquare size={10} /> Feedback unten rechts
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
