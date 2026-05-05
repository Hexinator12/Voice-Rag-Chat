import './ConfidenceBar.css';

export interface Source {
    content: string;
    metadata?: Record<string, any>;
    distance?: number;
}

interface ConfidenceBarProps {
    score: number; // 0-100
    evidence?: Array<{
        rank: number;
        score: number;
        raw_score: number;
        snippet: string;
        metadata: Record<string, any>;
    }>;
    sources?: Source[];
}

export function ConfidenceBar({ score, evidence, sources }: ConfidenceBarProps) {
    // Determine confidence level for color coding
    const getConfidenceLevel = (s: number): 'high' | 'medium' | 'low' => {
        if (s >= 75) return 'high';
        if (s >= 50) return 'medium';
        return 'low';
    };

    // Get source type icon based on metadata
    const getSourceIcon = (metadata?: Record<string, any>): string => {
        if (!metadata) return '📄';
        
        const source = metadata.source?.toLowerCase() || '';
        const title = metadata.title?.toLowerCase() || '';
        
        if (source.includes('webpage') || source.includes('url') || title.includes('http')) {
            return '🔗';
        }
        if (source.includes('voice') || source.includes('audio')) {
            return '🎤';
        }
        if (source.includes('document') || title.includes('pdf')) {
            return '📄';
        }
        if (source.includes('text') || source.includes('transcript')) {
            return '📝';
        }
        if (source.includes('image') || source.includes('visual')) {
            return '🖼️';
        }
        return '📄';
    };

    // Get unique source icons from evidence or sources
    const getSourceIcons = (): string[] => {
        const icons = new Set<string>();
        
        if (evidence && evidence.length > 0) {
            evidence.forEach((item) => {
                icons.add(getSourceIcon(item.metadata));
            });
        }
        
        if (sources && sources.length > 0) {
            sources.forEach((source) => {
                icons.add(getSourceIcon(source.metadata));
            });
        }
        
        return Array.from(icons).slice(0, 3); // Max 3 icons
    };

    const sourceIcons = getSourceIcons();
    const confidenceLevel = getConfidenceLevel(score);
    const clampedScore = Math.max(0, Math.min(100, score));

    const strongEvidenceCount = (evidence || []).filter((item) => item.score >= 50).length;
    const totalEvidenceCount = evidence?.length || 0;
    const hasFewSources = totalEvidenceCount <= 1;
    const reasons: string[] = [];
    if (confidenceLevel === 'low') {
        if (hasFewSources) reasons.push('Only a small number of sources were retrieved.');
        if (strongEvidenceCount === 0) reasons.push('Supporting sources are weak or low-similarity.');
        if (sources && sources.length > 0 && strongEvidenceCount < totalEvidenceCount) {
            reasons.push('Sources do not strongly agree with the answer.');
        }
        if (reasons.length === 0) {
            reasons.push('Score is conservative until stronger evidence is found.');
        }
    }

    return (
        <div className="confidence-bar-container">
            <div className="confidence-header">
                <div className="confidence-label">
                    <span className="label-text">Answer Confidence</span>
                    <span className={`confidence-percentage ${confidenceLevel}`}>
                        {clampedScore.toFixed(0)}%
                    </span>
                </div>
                {sourceIcons.length > 0 && (
                    <div className="source-icons">
                        {sourceIcons.map((icon, idx) => (
                            <span key={idx} className="source-icon" title={icon}>
                                {icon}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="confidence-bar-wrapper">
                <div className={`confidence-bar ${confidenceLevel}`}>
                    <div
                        className="confidence-fill"
                        style={{ width: `${clampedScore}%` }}
                    >
                        <div className="confidence-sparkle">✨</div>
                    </div>
                </div>
                <div className="confidence-backdrop"></div>
            </div>

            <div className="confidence-footer">
                <span className={`confidence-text ${confidenceLevel}`}>
                    {confidenceLevel === 'high' && '💚 High confidence'}
                    {confidenceLevel === 'medium' && '💛 Moderate confidence'}
                    {confidenceLevel === 'low' && '❤️ Lower confidence'}
                </span>
            </div>

            <div className="confidence-explainer">
                <span className="confidence-chip">Per-answer estimate</span>
                <details>
                    <summary>How this confidence works</summary>
                    <ul>
                        <li>Calibrated for this specific answer; benchmark accuracy (95% target) is measured on separate eval sets.</li>
                        <li>Factors: source strength, content overlap with the answer, and agreement across top sources.</li>
                        <li>Scores are conservative by design, so 100% should be rare; new evidence can raise or lower it.</li>
                    </ul>
                </details>
            </div>

            {confidenceLevel === 'low' && (
                <div className="confidence-low-context">
                    <div className="low-reason-title">Why low?</div>
                    <ul>
                        {reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                        ))}
                    </ul>
                    <div className="confidence-actions">
                        <span className="action-chip">Rephrase with more context</span>
                        <span className="action-chip">Ask for more sources</span>
                        <span className="action-chip">Flag for faculty review</span>
                    </div>
                </div>
            )}
        </div>
    );
}
