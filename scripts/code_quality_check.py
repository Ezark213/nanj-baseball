#!/usr/bin/env python3
"""
コード品質最終チェック

静的解析、コードカバレッジ、品質メトリクス検証
"""

import ast
import sys
import os
from pathlib import Path
import re

project_root = Path(__file__).parent.parent

class CodeQualityChecker:
    """コード品質チェッククラス"""

    def __init__(self):
        self.quality_report = {}
        self.python_files = []
        self.find_python_files()

    def find_python_files(self):
        """Pythonファイルを検索"""
        python_dir = project_root / "python"
        script_dir = project_root / "scripts"

        for directory in [python_dir, script_dir]:
            if directory.exists():
                self.python_files.extend(directory.glob("*.py"))

    def check_file_structure(self):
        """ファイル構造チェック"""
        required_files = [
            "python/video_composer.py",
            "python/performance_optimizer.py",
            "python/requirements.txt",
            "scripts/regenerate-all-theme-videos.py"
        ]

        missing_files = []
        existing_files = []

        for file_path in required_files:
            full_path = project_root / file_path
            if full_path.exists():
                existing_files.append(file_path)
            else:
                missing_files.append(file_path)

        self.quality_report["file_structure"] = {
            "existing_files": existing_files,
            "missing_files": missing_files,
            "structure_score": len(existing_files) / len(required_files)
        }

    def check_code_complexity(self):
        """コード複雑度チェック"""
        complexity_results = {}

        for py_file in self.python_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                tree = ast.parse(content)

                # クラス数、関数数、行数カウント
                classes = len([node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)])
                functions = len([node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)])
                lines = len(content.splitlines())

                complexity_results[py_file.name] = {
                    "classes": classes,
                    "functions": functions,
                    "lines": lines,
                    "complexity_score": (classes + functions) / max(lines / 50, 1)  # 50行あたりのクラス・関数数
                }

            except Exception as e:
                complexity_results[py_file.name] = {"error": str(e)}

        self.quality_report["code_complexity"] = complexity_results

    def check_documentation(self):
        """ドキュメント品質チェック"""
        doc_results = {}

        for py_file in self.python_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                tree = ast.parse(content)

                # docstring検出
                functions_with_docs = 0
                total_functions = 0
                classes_with_docs = 0
                total_classes = 0

                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        total_functions += 1
                        if ast.get_docstring(node):
                            functions_with_docs += 1
                    elif isinstance(node, ast.ClassDef):
                        total_classes += 1
                        if ast.get_docstring(node):
                            classes_with_docs += 1

                doc_coverage = 0
                if total_functions + total_classes > 0:
                    doc_coverage = (functions_with_docs + classes_with_docs) / (total_functions + total_classes)

                doc_results[py_file.name] = {
                    "functions_documented": functions_with_docs,
                    "total_functions": total_functions,
                    "classes_documented": classes_with_docs,
                    "total_classes": total_classes,
                    "documentation_coverage": doc_coverage
                }

            except Exception as e:
                doc_results[py_file.name] = {"error": str(e)}

        self.quality_report["documentation"] = doc_results

    def check_imports_and_dependencies(self):
        """インポート・依存関係チェック"""
        import_results = {}

        for py_file in self.python_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # import文を検出
                import_lines = []
                for line_num, line in enumerate(content.splitlines(), 1):
                    line = line.strip()
                    if line.startswith('import ') or line.startswith('from '):
                        import_lines.append((line_num, line))

                import_results[py_file.name] = {
                    "import_count": len(import_lines),
                    "imports": import_lines
                }

            except Exception as e:
                import_results[py_file.name] = {"error": str(e)}

        self.quality_report["imports"] = import_results

    def check_error_handling(self):
        """エラーハンドリングチェック"""
        error_handling_results = {}

        for py_file in self.python_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                tree = ast.parse(content)

                # try-except文カウント
                try_blocks = len([node for node in ast.walk(tree) if isinstance(node, ast.Try)])
                functions = len([node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)])

                error_handling_coverage = try_blocks / max(functions, 1)

                error_handling_results[py_file.name] = {
                    "try_blocks": try_blocks,
                    "total_functions": functions,
                    "error_handling_coverage": error_handling_coverage
                }

            except Exception as e:
                error_handling_results[py_file.name] = {"error": str(e)}

        self.quality_report["error_handling"] = error_handling_results

    def calculate_overall_quality_score(self):
        """総合品質スコア算出"""
        scores = []

        # ファイル構造スコア
        if "file_structure" in self.quality_report:
            scores.append(self.quality_report["file_structure"]["structure_score"])

        # ドキュメント品質スコア
        if "documentation" in self.quality_report:
            doc_scores = []
            for file_result in self.quality_report["documentation"].values():
                if "documentation_coverage" in file_result:
                    doc_scores.append(file_result["documentation_coverage"])
            if doc_scores:
                scores.append(sum(doc_scores) / len(doc_scores))

        # エラーハンドリングスコア
        if "error_handling" in self.quality_report:
            error_scores = []
            for file_result in self.quality_report["error_handling"].values():
                if "error_handling_coverage" in file_result:
                    error_scores.append(min(file_result["error_handling_coverage"], 1.0))  # 上限1.0
            if error_scores:
                scores.append(sum(error_scores) / len(error_scores))

        # 総合スコア
        overall_score = sum(scores) / len(scores) if scores else 0
        self.quality_report["overall_quality_score"] = overall_score

        return overall_score

    def generate_quality_report(self):
        """品質レポート生成"""
        print("コード品質最終チェック開始")
        print("=" * 50)

        self.check_file_structure()
        self.check_code_complexity()
        self.check_documentation()
        self.check_imports_and_dependencies()
        self.check_error_handling()

        overall_score = self.calculate_overall_quality_score()

        print("=" * 50)
        print("コード品質チェック結果")
        print("=" * 50)

        # ファイル構造
        if "file_structure" in self.quality_report:
            fs = self.quality_report["file_structure"]
            print(f"ファイル構造: {fs['structure_score']:.1%}")
            print(f"  必要ファイル: {len(fs['existing_files'])}/{len(fs['existing_files']) + len(fs['missing_files'])}")

        # ドキュメント品質
        if "documentation" in self.quality_report:
            print("ドキュメント品質:")
            for filename, doc_result in self.quality_report["documentation"].items():
                if "documentation_coverage" in doc_result:
                    print(f"  {filename}: {doc_result['documentation_coverage']:.1%}")

        # エラーハンドリング
        if "error_handling" in self.quality_report:
            print("エラーハンドリング:")
            for filename, eh_result in self.quality_report["error_handling"].items():
                if "error_handling_coverage" in eh_result:
                    print(f"  {filename}: {eh_result['try_blocks']}try-except/{eh_result['total_functions']}関数")

        print("=" * 50)
        print(f"総合品質スコア: {overall_score:.1%}")

        if overall_score >= 0.8:
            print("品質ステータス: 優秀")
        elif overall_score >= 0.6:
            print("品質ステータス: 良好")
        elif overall_score >= 0.4:
            print("品質ステータス: 普通")
        else:
            print("品質ステータス: 要改善")

        return self.quality_report

def main():
    """メイン関数"""
    checker = CodeQualityChecker()
    report = checker.generate_quality_report()

    # レポート保存
    import json
    output_file = project_root / "tests" / "code_quality_report.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n品質レポート保存: {output_file}")

    return report["overall_quality_score"] >= 0.6  # 60%以上で合格

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)