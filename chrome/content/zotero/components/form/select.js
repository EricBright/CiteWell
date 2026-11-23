"use strict";

function _interopDefault(mod) {
	return mod && mod.__esModule ? mod.default : mod;
}
var React = _interopDefault(require("react"));
var h = React.createElement;
var PropTypes = _interopDefault(require("prop-types"));
var cx = _interopDefault(require("classnames"));
var {
	noop,
} = require("../utils");
var Select = _interopDefault(require("react-select"));
class SelectInput extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			value: props.value,
		};
	}

	cancel(event = null) {
		this.props.onCancel(this.hasChanged, event);
	}

	commit(event = null, value = null, force = false) {
		this.props.onCommit(value || this.state.value, force ? true : this.hasChanged, event);
	}

	focus() {
		if (this.input != null) {
			this.input.focus();
		}
	}

	UNSAFE_componentWillReceiveProps({
		value,
	}) {
		if (value !== this.props.value) {
			this.setState({
				value,
			});
		}
	}

	handleChange(value, ev) {
		value = value !== null || value === null && this.props.clearable ? value : this.props.value;
		this.setState({
			value,
		});
		if (this.props.onChange(value) || this.forceCommitOnNextChange) {
			if (!ev) {
				//@NOTE: this is using undocumeneted feature of react-selct v1, but see #131
				const source = typeof this.input.input.getInput === "function"
					? this.input.input.getInput()
					: this.input.input;
				ev = {
					type: "change",
					currentTarget: source,
					target: source,
				};
			}
			this.commit(ev, value, value !== this.props.value);
		}
		this.forceCommitOnNextChange = false;
	}

	handleBlur(event) {
		this.props.onBlur(event);
		this.cancel(event);
		if (this.props.autoBlur) {
			this.forceCommitOnNextChange = true;
		}
	}

	handleFocus(event) {
		this.props.onFocus(event);
	}

	handleKeyDown(event) {
		switch (event.key) {
			case "Escape":
				this.cancel(event);
				break;
			default:
		}
	}

	get hasChanged() {
		return this.state.value !== this.props.value;
	}

	get defaultSelectProps() {
		return {
			simpleValue: true,
			clearable: false,
		};
	}

	renderInput(userType, viewport) {
		const {
			options,
			autoFocus,
			className,
			id,
			placeholder,
			tabIndex,
			value,
		} = this.props;
		const commonProps = {
			disabled: this.props.isDisabled,
			onBlur: this.handleBlur.bind(this),
			onFocus: this.handleFocus.bind(this),
			readOnly: this.props.isReadOnly,
			ref: input => this.input = input,
			required: this.props.isRequired,
		};
		if (userType === "touch" || viewport.xxs || viewport.xs || viewport.sm) {
			const props = {
				...commonProps,
				onKeyDown: this.handleKeyDown.bind(this),
				onChange: ev => this.handleChange(ev.target.value, ev),
				autoFocus,
				id,
				placeholder,
				tabIndex,
				value,
			};
			return h(
				"div",
				{
					className: "native-select-wrap",
				},
				h(
					"select",
					props,
					options.map(({
						value,
						label,
					}) => h("option", {
						key: value,
						value: value,
					}, label)
					),
				),
				h("div", {
					className: className,
				}, (options.find(o => o.value === value) || options[0] || {}).label),
			);
		}
		else {
			const props = {
				...this.defaultSelectProps,
				...this.props,
				...commonProps,
				onInputKeyDown: this.handleKeyDown.bind(this),
				onChange: this.handleChange.bind(this),
			};
			return h(Select, props);
		}
	}

	renderSpinner() {
		return null;
		//return this.props.isBusy ? <Spinner className="small" /> : null;
	}

	render() {
		const {
			userType,
			viewport,
		} = this.props.device;
		const className = cx({
			"input-group": true,
			select: true,
			busy: this.props.isBusy,
		}, this.props.inputGroupClassName);
		return h(
			"div",
			{
				className: className,
			},
			this.renderInput(userType, viewport),
			this.renderSpinner(),
		);
	}

	static defaultProps = {
		className: "form-control",
		onBlur: noop,
		onCancel: noop,
		onChange: noop,
		onCommit: noop,
		onFocus: noop,
		options: [],
		tabIndex: -1,
		value: "",
	};

	static propTypes = {
		autoFocus: PropTypes.bool,
		className: PropTypes.string,
		id: PropTypes.string,
		inputGroupClassName: PropTypes.string,
		isBusy: PropTypes.bool,
		isDisabled: PropTypes.bool,
		isReadOnly: PropTypes.bool,
		isRequired: PropTypes.bool,
		onBlur: PropTypes.func.isRequired,
		onCancel: PropTypes.func.isRequired,
		onChange: PropTypes.func.isRequired,
		onCommit: PropTypes.func.isRequired,
		onFocus: PropTypes.func.isRequired,
		options: PropTypes.array.isRequired,
		placeholder: PropTypes.string,
		tabIndex: PropTypes.number,
		value: PropTypes.string.isRequired,
	};
}
module.exports = SelectInput;
