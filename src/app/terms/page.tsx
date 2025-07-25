"use client"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Demo Version Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                This is a demonstration version of Terra Voyage provided for evaluation purposes. 
                The demo is provided "as is" without warranties of any kind. Trip planning suggestions 
                are for demonstration purposes only and should not be used for actual travel planning.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By using Terra Voyage, you agree to be bound by these Terms of Service. If you do not 
                agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Use of Service</h2>
              <p className="text-gray-700 leading-relaxed">
                You may use Terra Voyage for lawful purposes only. You agree not to use the service 
                to violate any laws or regulations, or to interfere with the proper functioning of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                The Terra Voyage service, including its design, code, and content, is protected by 
                intellectual property laws. You may not copy, modify, or distribute our content without permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Disclaimer</h2>
              <p className="text-gray-700 leading-relaxed">
                Travel information and suggestions are provided for informational purposes only. 
                Always verify travel requirements, safety conditions, and booking details independently 
                before making travel decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                Terra Voyage shall not be liable for any direct, indirect, incidental, or consequential 
                damages resulting from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at{" "}
                <a href="/contact" className="text-blue-600 hover:text-blue-800">
                  our contact page
                </a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}