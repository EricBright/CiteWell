"use strict";

function _interopDefault(mod) {
	return mod && mod.__esModule ? mod.default : mod;
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2019 Corporation for Digital Scholarship
                     Vienna, Virginia, USA
                     https://digitalscholar.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/
var React = _interopDefault(require("react"));
var h = React.createElement;
var PropTypes = _interopDefault(require("prop-types"));
var cx = _interopDefault(require("classnames"));
var EditableContent = _interopDefault(require("./editable/content"));
var Input = _interopDefault(require("./form/input"));
var TextAreaInput = _interopDefault(require("./form/textArea"));
var SelectInput = _interopDefault(require("./form/select"));
var {
	noop
} = require("./utils");
class Editable extends React.PureComponent {
	get isActive() {
		return (this.props.isActive || this.props.isBusy) && !this.props.isDisabled;
	}

	get isReadOnly() {
		return this.props.isReadOnly || this.props.isBusy;
	}

	get className() {
		const {
			input,
			inputComponent
		} = this.props;
		return {
			editable: true,
			editing: this.isActive,
			textarea: inputComponent === TextAreaInput || input && input.type === TextAreaInput,
			select: inputComponent === SelectInput || input && input.type === SelectInput
		};
	}

	renderContent() {
		const hasChildren = typeof this.props.children !== "undefined";
		return h(React.Fragment, null, hasChildren ? this.props.children : h(EditableContent, this.props));
	}

	renderControls() {
		const {
			input: InputElement,
			inputComponent: InputComponent
		} = this.props;
		if (InputElement) {
			return InputElement;
		}
		else {
			const {
				className,
				innerRef,
				...props
			} = this.props;
			props.ref = innerRef;
			return h(InputComponent, {
				className: cx(className, "editable-control"),
				...props
			});
		}
	}

	render() {
		const {
			isDisabled,
			isReadOnly
		} = this.props;
		return h("div", {
			tabIndex: isDisabled || isReadOnly ? null : this.isActive ? null : 0,
			onClick: event => this.props.onClick(event),
			onFocus: event => this.props.onFocus(event),
			onMouseDown: event => this.props.onMouseDown(event),
			className: cx(this.className)
		}, this.isActive ? this.renderControls() : this.renderContent());
	}

	static defaultProps = {
		inputComponent: Input,
		onClick: noop,
		onFocus: noop,
		onMouseDown: noop
	};

	static propTypes = {
		children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
		input: PropTypes.element,
		inputComponent: PropTypes.elementType,
		isActive: PropTypes.bool,
		isBusy: PropTypes.bool,
		isDisabled: PropTypes.bool,
		isReadOnly: PropTypes.bool
	};
}
module.exports = /*#__PURE__*/React.forwardRef((props, ref) => h(Editable, {
	innerRef: ref,
	...props
}));
