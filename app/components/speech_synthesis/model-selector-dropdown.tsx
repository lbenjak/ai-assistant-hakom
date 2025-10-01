import React from 'react';
import styles from './model-selector-dropdown.module.css';

interface ModelSelectorDropdownProps {
    models: string[];
    selectedModel: string | null;
    handleModelSelect: (model: string) => void;
}

const ModelSelectorDropdown = ({ models, selectedModel, handleModelSelect }: ModelSelectorDropdownProps) => {

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newSelectedModel = event.target.value;
        handleModelSelect(newSelectedModel);
    };

    return (
        <div className={styles.modelDropdownContainer}>
            <label htmlFor="model-select" className={styles.modelLabel}>
                Model sinteze govora:
            </label>
            <select
                id="model-select"
                value={selectedModel || ""}
                onChange={handleChange}
                className={styles.modelSelect}
            >
                <option value="" disabled>
                    Model sinteze govora:
                </option>
                {models.map((model) => (
                    <option key={model} value={model}>
                        {model}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default ModelSelectorDropdown;
