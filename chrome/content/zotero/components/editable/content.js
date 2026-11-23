"use strict";

function _interopDefault(mod) {
	return mod && mod.__esModule ? mod.default : mod;
}
var React = _interopDefault(require("react"));
var h = React.createElement;
var PropTypes = _interopDefault(require("prop-types"));
var cx = _interopDefault(require("classnames"));
var TextAreaInput = _interopDefault(require("../form/textArea"));
var Select = _interopDefault(require("../form/select"));
class EditableContent extends React.PureComponent {
	get hasValue() {
		const {
			input,
			value,
		} = this.props;
		return !!(value || input && input.props.value);
	}

	get isSelect() {
		const {
			input,
			inputComponent,
		} = this.props;
		return inputComponent === Select || input && input.type == Select;
	}

	get isTextarea() {
		const {
			input,
			inputComponent,
		} = this.props;
		return inputComponent === TextAreaInput || input && input.type === TextAreaInput;
	}

	get displayValue() {
		const {
			options,
			display,
			input,
		} = this.props;
		const value = this.props.value || input && input.props.value;
		const placeholder = this.props.placeholder || input && input.props.placeholder;
		if (!this.hasValue) {
			return placeholder;
		}
		if (display) {
			return display;
		}
		if (this.isSelect && options) {
			const displayValue = options.find(e => e.value == value);
			return displayValue ? displayValue.label : value;
		}
		return value;
	}

	render() {
		const className = {
			"editable-content": true,
			placeholder: !this.hasValue,
		};
		return h("div", {
			className: cx(this.props.className, className),
		}, this.displayValue);
	}

	static defaultProps = {
		value: "",
		placeholder: "",
	};

	static propTypes = {
		display: PropTypes.string,
		input: PropTypes.element,
		inputComponent: PropTypes.elementType,
		options: PropTypes.array,
		placeholder: PropTypes.string,
		value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	};
}
module.exports = EditableContent;
