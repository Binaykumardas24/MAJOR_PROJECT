import React from "react"; const Test = () => ( <div>                    borderRadius: '10px',
                    border: selectedOptions.includes(opt) ? '2px solid #2563eb' : '1px solid #d1d5db',
                    background: selectedOptions.includes(opt) ? 'rgba(37,99,235,0.08)' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type={selectedMode === 'role' ? 'radio' : 'checkbox'}
                    name="select-option"
                    checked={selectedOptions.includes(opt)}
                    onChange={() => !isLocked && toggleOption(opt)}
                    disabled={isLocked}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 14, color: '#334155' }}>
              Selected ({selectedOptions.length}): {selectedOptions.join(', ') || 'None'}
            </div>

            <div style={{ marginTop: 12, marginBottom: 14, border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fafbff' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' }}>
                  Select experience:
                </label>
                <select
                  value={experience}
                  onChange={(e) => !isLocked && setExperience(e.target.value)}
                  disabled={isLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    width: '100%',
                    maxWidth: 320,
                    background: isLocked ? '#f1f5f9' : '#fff'
                  }}
                >
                  <option value="" disabled>
                    Select Experience Level
                  </option>
                  <option value="Fresher">Fresher</option>
                  <option value="Mid-level">Mid-level</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>

              {selectedMode && experience && (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Select Mode</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button
                      onClick={() => setConfigMode('question')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: configMode === 'question' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: configMode === 'question' ? '#e0e7ff' : '#fff',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      disabled={isLocked}
                    >
                      Question Mode
                    </button>
                    <button
                      onClick={() => setConfigMode('time')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: configMode === 'time' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: configMode === 'time' ? '#e0e7ff' : '#fff',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      disabled={isLocked}
                    >
                      Time Mode
                    </button>
                  </div>
                </>
              )}
            </div>

            {configMode === 'question' && (
                <div>
                  <label style={{ fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' }}>
                    Number of questions:
                  </label>
                  <select
                    value={questionCount || 'custom'}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setQuestionCount('custom');
                        setCustomQuestionCount('');
                      } else {
                        setQuestionCount(Number(e.target.value));
                        setCustomQuestionCount('');
                      }
                    }}
                    disabled={isLocked}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      width: '100%',
                      maxWidth: 320,
                      background: isLocked ? '#f1f5f9' : '#fff'
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={3}>3</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value="custom">Custom</option>
                  </select>

                  {questionCount === 'custom' && (
                    <input
                      type="number"
                      min={1}
                      value={customQuestionCount}
                      onChange={(e) => setCustomQuestionCount(e.target.value)}
                      disabled={isLocked}
                      placeholder="Enter custom count"
                      style={{
                        marginTop: 8,
                        width: '100%',
                        maxWidth: 320,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  )}
                </div>
              )}

              {configMode === 'time' && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' }}>
                    Time interval (minutes):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={timeModeValue}
                    onChange={(e) => setTimeModeValue(e.target.value)}
                    disabled={isLocked}
                    placeholder="e.g. 10"
                    style={{
                      width: '100%',
                      maxWidth: 320,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: isLocked ? '#f1f5f9' : '#fff'
                    }}
                  />
                  <small style={{ color: '#475569' }}>
                    AI will ask questions for this time interval.
                  </small>
                </div>
              )}

              <div style={{ marginTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>Mode Type</div>
                <button
                  onClick={() => setPracticeType('practice')}
                  style={{
                    marginRight: 8,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: practiceType === 'practice' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: practiceType === 'practice' ? '#e0e7ff' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  disabled={isLocked}
                >
                  🔘 Practice Mode (no timer)
                </button>
                <button
                  onClick={() => setPracticeType('interview')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: practiceType === 'interview' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: practiceType === 'interview' ? '#e0e7ff' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  disabled={isLocked}
                >
                  🔘 Interview Mode (timer ON)
                </button>
              </div>

              {practiceType === 'interview' && (
                <div>
                  <label style={{ fontSize: 14, color: '#334155', marginBottom: 6, display: 'block' }}>
                    Interview timer (minutes):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    disabled={isLocked}
                    placeholder="Enter timer in minutes"
                    style={{
                      width: '100%',
                      maxWidth: 320,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: isLocked ? '#f1f5f9' : '#fff'
                    }}
                  />
                </div>
              )}

            </div>

            <button
              className="topic-action-btn"
              style={{
                marginTop: 6,</div> ); export default Test;