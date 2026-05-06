{{- define "environmentMerged" -}}

{{- if hasKey .Values.mclabels "environment" -}}
{{- .Values.mclabels.environment -}}
{{- else if (and (hasKey .Values "global") (hasKey .Values.global "mclabels") (hasKey .Values.global.mclabels "environment")) -}}
{{- .Values.global.mclabels.environment -}}
{{- else -}}
undefined
{{- end -}}
{{- end -}}
